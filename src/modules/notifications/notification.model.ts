import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type:
    | "task-assigned"
    | "comment-added"
    | "project-invitation"
    | "task-due";
  message: string;
  projectId?: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  isRead: boolean;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "task-assigned",
        "comment-added",
        "project-invitation",
        "task-due",
      ],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },

    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
    },

    isRead: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1 });

export const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);