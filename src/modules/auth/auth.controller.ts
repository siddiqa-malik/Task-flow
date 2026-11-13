import { Request, Response } from "express";
import {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from "./auth.validation.js";
import {
    registerUser,
    loginUser,
    getCurrentUser,
    requestPasswordReset,
    resetPasswordWithToken,
    checkEmailExists,
    googleAuthUser,
    githubAuthUser,
} from "./auth.service.js";

import { AuthenticatedRequest } from "../../types/auth.types.js";

export const register = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validatedData = registerSchema.parse(req.body);

        const user = await registerUser(validatedData);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Registration failed",
        });
    }
};

export const login = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validatedData = loginSchema.parse(req.body);

        const { existingUser, token } = await loginUser(validatedData);

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: {
                    id: existingUser._id,
                    name: existingUser.name,
                    email: existingUser.email,
                    role: existingUser.role,
                },
            },
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Login failed",
        });
    }
};

export const getMe = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });

            return;
        }

        const user = await getCurrentUser(userId);

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "User not found",
        });
    }
};

export const forgotPassword = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const validatedData = forgotPasswordSchema.parse(req.body);
        const result = await requestPasswordReset(validatedData.email);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to process forgot password request",
        });
    }
};

export const resetPassword = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const token = (req.params.token || req.body.token)?.trim();
        if (!token) {
            res.status(400).json({
                success: false,
                message: "Reset token is required",
            });
            return;
        }

        const validatedData = resetPasswordSchema.parse(req.body);
        const result = await resetPasswordWithToken(token, validatedData.password);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to reset password",
        });
    }
};

export const checkEmail = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const email = req.body?.email;
        if (!email) {
            res.status(400).json({ success: false, message: "Email is required" });
            return;
        }
        const exists = await checkEmailExists(email);
        res.status(200).json({ success: true, exists });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to check email",
        });
    }
};

export const googleAuth = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { name, email, avatar, isSignUp } = req.body;
        if (!email) {
            res.status(400).json({ success: false, message: "Email is required" });
            return;
        }

        const { existingUser, token, isNewUser } = await googleAuthUser({
            name: name || email.split("@")[0],
            email,
            avatar,
            isSignUp: !!isSignUp,
        });

        res.status(200).json({
            success: true,
            message: isNewUser ? "User registered successfully with Google" : "Login successful with Google",
            data: {
                token,
                user: {
                    id: existingUser._id,
                    name: existingUser.name,
                    email: existingUser.email,
                    role: existingUser.role,
                    avatar: existingUser.avatar,
                },
                isNewUser,
            },
        });
    } catch (error: any) {
        res.status(error.statusCode || 400).json({
            success: false,
            notRegistered: !!error.notRegistered,
            message: error instanceof Error ? error.message : "Google authentication failed",
        });
    }
};

export const githubAuth = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { code, expectedEmail } = req.body;
        if (!code) {
            res.status(400).json({
                success: false,
                message: "GitHub authorization code is required",
            });
            return;
        }

        const authHeader = req.headers.authorization;
        const result = await githubAuthUser(code, expectedEmail, authHeader);

        res.status(200).json({
            success: true,
            message: "GitHub authentication successful",
            data: result,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            noAccountForEmail: error?.noAccountForEmail || false,
            expectedEmail: error?.expectedEmail,
            connectedGithubLogin: error?.connectedGithubLogin,
            message:
                error instanceof Error
                    ? error.message
                    : "GitHub authentication failed",
        });
    }
};
