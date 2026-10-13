import mongoose from "mongoose";
import { UserSettings } from "./userSettings.model.js";

interface UpdateSettingsInput {
  theme?: "light" | "dark" | "system";
  emailNotifications?: boolean;
  taskReminders?: boolean;
  compactView?: boolean;
}

// =====================================================
// GET USER SETTINGS (AUTO-INITIALIZE IF NOT EXISTS)
// =====================================================
export const getSettings = async (userId: string) => {
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanUserId)) {
    throw new Error("Invalid user ID");
  }

  let settings = await UserSettings.findOne({
    userId: new mongoose.Types.ObjectId(cleanUserId),
  });

  if (!settings) {
    settings = await UserSettings.create({
      userId: new mongoose.Types.ObjectId(cleanUserId),
    });
  }

  return settings;
};

// =====================================================
// UPDATE USER SETTINGS
// =====================================================
export const updateSettings = async (
  userId: string,
  data: UpdateSettingsInput
) => {
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanUserId)) {
    throw new Error("Invalid user ID");
  }

  const settings = await UserSettings.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(cleanUserId) },
    { $set: data },
    { new: true, upsert: true, runValidators: true }
  );

  return settings;
};
