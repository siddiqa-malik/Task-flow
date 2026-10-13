import mongoose, { Schema, Document } from "mongoose";

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  theme: "light" | "dark" | "system";
  emailNotifications: boolean;
  taskReminders: boolean;
  compactView: boolean;
}

const userSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },

    emailNotifications: {
      type: Boolean,
      default: true,
    },

    taskReminders: {
      type: Boolean,
      default: true,
    },

    compactView: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const UserSettings = mongoose.model<IUserSettings>(
  "UserSettings",
  userSettingsSchema
);
