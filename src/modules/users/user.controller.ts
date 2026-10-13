import { Response } from "express";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import {
  getProfile,
  updateProfile,
  changePassword,
  searchUsers,
} from "./user.service.js";
import {
  updateProfileSchema,
  changePasswordSchema,
} from "./user.validation.js";

// =====================================================
// GET CURRENT USER CONTROLLER
// =====================================================
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

    const user = await getProfile(userId);

    res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      data: user,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch profile",
    });
  }
};

// =====================================================
// UPDATE CURRENT USER PROFILE CONTROLLER
// =====================================================
export const updateMe = async (
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

    const validatedData = updateProfileSchema.parse(req.body);
    const updatedUser = await updateProfile(userId, validatedData);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update profile",
    });
  }
};

// =====================================================
// CHANGE PASSWORD CONTROLLER
// =====================================================
export const changeUserPassword = async (
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

    const { currentPassword, newPassword } = changePasswordSchema.parse(
      req.body
    );

    const result = await changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to change password",
    });
  }
};

// =====================================================
// SEARCH USERS CONTROLLER
// =====================================================
export const search = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const query = (req.query.q as string) || "";
    const userId = req.user?.id;

    const users = await searchUsers(query, userId);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to search users",
    });
  }
};
