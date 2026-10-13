import { Response } from "express";
import { isValidObjectId } from "mongoose";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import {
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "./notification.service.js";

// =====================================================
// GET USER NOTIFICATIONS
// =====================================================
export const getAll = async (
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

    const unreadOnly = req.query.unreadOnly === "true";
    const notifications = await getUserNotifications(userId, unreadOnly);

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch notifications",
    });
  }
};

// =====================================================
// GET UNREAD COUNT
// =====================================================
export const countUnread = async (
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

    const unreadCount = await getUnreadCount(userId);

    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch unread count",
    });
  }
};

// =====================================================
// MARK SINGLE AS READ
// =====================================================
export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const notificationId = req.params.notificationId?.trim();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!notificationId || !isValidObjectId(notificationId)) {
      res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
      return;
    }

    const notification = await markNotificationAsRead(notificationId, userId);

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to mark notification as read",
    });
  }
};

// =====================================================
// MARK ALL AS READ
// =====================================================
export const markAllRead = async (
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

    const result = await markAllNotificationsAsRead(userId);

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
          : "Failed to mark all as read",
    });
  }
};

// =====================================================
// DELETE NOTIFICATION
// =====================================================
export const remove = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const notificationId = req.params.notificationId?.trim();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!notificationId || !isValidObjectId(notificationId)) {
      res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
      return;
    }

    const deleted = await deleteNotification(notificationId, userId);

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      data: deleted,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete notification",
    });
  }
};
