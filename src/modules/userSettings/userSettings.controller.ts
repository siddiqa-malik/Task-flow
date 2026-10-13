import { Response } from "express";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import {
  getSettings,
  updateSettings,
} from "./userSettings.service.js";
import { updateSettingsSchema } from "./userSettings.validation.js";

// =====================================================
// GET SETTINGS CONTROLLER
// =====================================================
export const get = async (
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

    const settings = await getSettings(userId);

    res.status(200).json({
      success: true,
      message: "Settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch settings",
    });
  }
};

// =====================================================
// UPDATE SETTINGS CONTROLLER
// =====================================================
export const update = async (
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

    const validatedData = updateSettingsSchema.parse(req.body);
    const updated = await updateSettings(userId, validatedData);

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update settings",
    });
  }
};
