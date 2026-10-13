import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { user } from "../modules/users/user.model.js";
import { AuthenticatedRequest } from "../types/auth.types.js";

export const authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });

            return;
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as {
            userId: string;
            role: "admin" | "user";
        };

        const existingUser = await user.findById(decoded.userId);

        if (!existingUser) {
            res.status(401).json({
                success: false,
                message: "User not found",
            });

            return;
        }

        req.user = {
            id: existingUser._id.toString(),
            role: existingUser.role,
        };

        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};