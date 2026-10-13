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