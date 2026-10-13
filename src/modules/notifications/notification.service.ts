import mongoose from "mongoose";
import { Notification } from "./notification.model.js";

interface CreateNotificationInput {
  userId: string | mongoose.Types.ObjectId;
  type: "task-assigned" | "comment-added" | "project-invitation" | "task-due";
  message: string;
  projectId?: string | mongoose.Types.ObjectId;
  taskId?: string | mongoose.Types.ObjectId;
}

// =====================================================
// CREATE NOTIFICATION (HELPER)
// =====================================================
export const createNotification = async (data: CreateNotificationInput) => {
  try {
    const notification = await Notification.create({
      userId: new mongoose.Types.ObjectId(data.userId.toString()),
      type: data.type,
      message: data.message.trim(),
      projectId: data.projectId
        ? new mongoose.Types.ObjectId(data.projectId.toString())
        : undefined,
      taskId: data.taskId
        ? new mongoose.Types.ObjectId(data.taskId.toString())
        : undefined,
      isRead: false,
    });

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
};

// =====================================================
// GET CURRENT USER NOTIFICATIONS
// =====================================================
export const getUserNotifications = async (
  userId: string,
  unreadOnly: boolean = false
) => {
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanUserId)) {
    throw new Error("Invalid user ID");
  }

  const query: any = {
    userId: new mongoose.Types.ObjectId(cleanUserId),
  };

  if (unreadOnly) {
    query.isRead = false;
  }

  const notifications = await Notification.find(query)
    .populate("projectId", "name")
    .populate("taskId", "title status priority")
    .sort({ createdAt: -1 })
    .limit(50);

  return notifications;
};

// =====================================================
// GET UNREAD COUNT
// =====================================================
export const getUnreadCount = async (userId: string) => {
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanUserId)) {
    throw new Error("Invalid user ID");
  }

  const count = await Notification.countDocuments({
    userId: new mongoose.Types.ObjectId(cleanUserId),
    isRead: false,
  });

  return count;
};

// =====================================================
// MARK SINGLE NOTIFICATION AS READ
// =====================================================
export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
) => {
  const cleanNotificationId = notificationId.trim();
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanNotificationId)) {
    throw new Error("Invalid notification ID");
  }

  const notification = await Notification.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(cleanNotificationId),
      userId: new mongoose.Types.ObjectId(cleanUserId),
    },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    throw new Error("Notification not found");
  }

  return notification;
};

// =====================================================
// MARK ALL AS READ
// =====================================================
export const markAllNotificationsAsRead = async (userId: string) => {
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanUserId)) {
    throw new Error("Invalid user ID");
  }

  await Notification.updateMany(
    {
      userId: new mongoose.Types.ObjectId(cleanUserId),
      isRead: false,
    },
    { $set: { isRead: true } }
  );

  return { message: "All notifications marked as read" };
};

// =====================================================
// DELETE NOTIFICATION
// =====================================================
export const deleteNotification = async (
  notificationId: string,
  userId: string
) => {
  const cleanNotificationId = notificationId.trim();
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanNotificationId)) {
    throw new Error("Invalid notification ID");
  }

  const deleted = await Notification.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(cleanNotificationId),
    userId: new mongoose.Types.ObjectId(cleanUserId),
  });

  if (!deleted) {
    throw new Error("Notification not found");
  }

  return deleted;
};
