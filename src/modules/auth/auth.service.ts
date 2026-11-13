import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { user } from "../users/user.model.js";
import { sendPasswordResetEmail } from "../../utils/email.service.js";

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

export const registerUser = async (data: RegisterData) => {
  const existingUser = await user.findOne({
    email: data.email.toLowerCase().trim(),
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newUser = await user.create({
    name: data.name.trim(),
    email: data.email.toLowerCase().trim(),
    password: hashedPassword,
  });

  return newUser;
};

export const loginUser = async (data: LoginData) => {
  const existingUser = await user.findOne({
    email: data.email.toLowerCase().trim(),
  });

  if (!existingUser) {
    throw new Error("Invalid email or password");
  }

  const isPasswordCorrect = await bcrypt.compare(
    data.password,
    existingUser.password
  );

  if (!isPasswordCorrect) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
    {
      userId: existingUser._id,
      role: existingUser.role,
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "1d",
    }
  );

  return {
    existingUser,
    token,
  };
};

export const getCurrentUser = async (userId: string) => {
  const existingUser = await user.findById(userId).select("-password");

  if (!existingUser) {
    throw new Error("User not found");
  }

  return existingUser;
};

export const requestPasswordReset = async (email: string) => {
  const cleanEmail = email.toLowerCase().trim();
  const existingUser = await user.findOne({ email: cleanEmail });

  if (existingUser) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    existingUser.resetPasswordToken = resetToken;
    existingUser.resetPasswordExpires = resetExpires;
    await existingUser.save();

    await sendPasswordResetEmail(existingUser.email, resetToken, existingUser.name);
  }

  return {
    message: "If an account with that email exists, a password reset link has been sent.",
  };
};

export const resetPasswordWithToken = async (
  token: string,
  newPassword: string
) => {
  const cleanToken = token.trim();

  const existingUser = await user.findOne({
    resetPasswordToken: cleanToken,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!existingUser) {
    throw new Error("Password reset token is invalid or has expired");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  existingUser.password = hashedPassword;
  existingUser.resetPasswordToken = undefined;
  existingUser.resetPasswordExpires = undefined;
  await existingUser.save();

  return {
    message: "Password has been successfully reset. You can now log in.",
  };
};

export const checkEmailExists = async (email: string) => {
  const cleanEmail = email.toLowerCase().trim();
  const existingUser = await user.findOne({ email: cleanEmail });
  return !!existingUser;
};

export const googleAuthUser = async (data: {
  name: string;
  email: string;
  avatar?: string;
  isSignUp?: boolean;
}) => {
  const cleanEmail = data.email.toLowerCase().trim();
  const existingUser = await user.findOne({ email: cleanEmail });

  if (!existingUser) {
    if (!data.isSignUp) {
      const err: any = new Error("No account found with this email. Please sign up first.");
      err.notRegistered = true;
      err.statusCode = 404;
      throw err;
    }

    const randomPassword = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const newUser: any = await user.create({
      name: (data.name || cleanEmail.split("@")[0]).trim(),
      email: cleanEmail,
      password: hashedPassword,
      avatar: data.avatar || undefined,
    });

    const token = jwt.sign(
      {
        userId: newUser._id,
        role: newUser.role,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1d",
      }
    );

    return {
      existingUser: newUser,
      token,
      isNewUser: true,
    };
  }

  const token = jwt.sign(
    {
      userId: existingUser._id,
      role: existingUser.role,
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "1d",
    }
  );

  return {
    existingUser,
    token,
    isNewUser: false,
  };
};


export const githubAuthUser = async (
  code: string,
  expectedEmail?: string,
  authHeader?: string
) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth credentials (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET) not configured in backend .env');
  }

  // 1. Resolve logged-in user from Bearer JWT token if available
  let loggedInUserEmail: string | null = null;
  let loggedInUserId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const tokenStr = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(
        tokenStr,
        (process.env.JWT_SECRET || 'taskflow_jwt_secret_key') as string
      );
      const targetId = decoded?.userId || decoded?.id;
      if (targetId) {
        const u: any = await user.findById(targetId);
        if (u) {
          loggedInUserId = u._id.toString();
          if (u.email) loggedInUserEmail = u.email.toLowerCase().trim();
        }
      }
    } catch (jwtErr) {
      console.warn('JWT verification error in githubAuthUser:', jwtErr);
    }
  }

  // 2. Obtain GitHub Access Token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData?.access_token;

  if (!accessToken) {
    throw new Error(tokenData?.error_description || 'Failed to obtain GitHub access token');
  }

  // 3. Fetch GitHub User Profile
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'TaskFlow-App',
    },
  });
  const ghUser = await userRes.json();

  // 4. Fetch all verified emails associated with this GitHub account
  const emailsRes = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'TaskFlow-App',
    },
  });
  const emailsList = await emailsRes.json();
  const allGithubEmails: string[] = [];
  if (Array.isArray(emailsList)) {
    emailsList.forEach((e: any) => {
      if (e.email) allGithubEmails.push(e.email.toLowerCase().trim());
    });
  }
  if (ghUser.email) {
    allGithubEmails.push(ghUser.email.toLowerCase().trim());
  }

  // 5. Determine the authentic expected user email (Google account email)
  let cleanExpectedEmail: string | null = null;
  if (loggedInUserEmail) {
    cleanExpectedEmail = loggedInUserEmail;
  } else if (expectedEmail && !expectedEmail.toLowerCase().includes('designs.invent98')) {
    cleanExpectedEmail = expectedEmail.toLowerCase().trim();
  }

  // 6. Check matching with authentic Google email
  if (cleanExpectedEmail) {
    const isMatching = allGithubEmails.includes(cleanExpectedEmail);
    if (!isMatching) {
      const err: any = new Error(
        `No GitHub account associated with ${cleanExpectedEmail} was found (Authorized as: @${ghUser.login}). Please sign in with your matching account or continue without GitHub.`
      );
      err.noAccountForEmail = true;
      err.expectedEmail = cleanExpectedEmail;
      err.connectedGithubLogin = ghUser.login;
      throw err;
    }
  }

  // 7. Find or link user in database
  const targetEmail = cleanExpectedEmail || allGithubEmails[0] || (ghUser.email ? ghUser.email.toLowerCase().trim() : null);
  if (!targetEmail) {
    throw new Error('Unable to retrieve verified email from GitHub account');
  }

  let existingUser: any = null;
  if (loggedInUserId) {
    existingUser = await user.findById(loggedInUserId);
  }
  if (!existingUser) {
    existingUser = await user.findOne({ email: targetEmail });
  }

  if (!existingUser) {
    const randomPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    existingUser = await user.create({
      name: (ghUser.name || ghUser.login || targetEmail.split('@')[0]).trim(),
      email: targetEmail,
      password: hashedPassword,
      avatar: ghUser.avatar_url || null,
    });
  } else {
    if (!existingUser.avatar && ghUser.avatar_url) {
      existingUser.avatar = ghUser.avatar_url;
      await existingUser.save();
    }
  }

  const token = jwt.sign(
    {
      userId: existingUser._id,
      role: existingUser.role,
    },
    (process.env.JWT_SECRET || 'taskflow_jwt_secret_key') as string,
    {
      expiresIn: '1d',
    }
  );

  return {
    user: existingUser,
    token,
    github: {
      username: ghUser.login,
      avatar: ghUser.avatar_url,
      accessToken,
    },
  };
};
