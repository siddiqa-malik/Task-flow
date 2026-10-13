import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  getAll,
  countUnread,
  markAsRead,
  markAllRead,
  remove,
} from "./notification.controller.js";

const router = Router();

router.get("/", authenticate, getAll);
router.get("/unread-count", authenticate, countUnread);
router.patch("/read-all", authenticate, markAllRead);
router.patch("/:notificationId/read", authenticate, markAsRead);
router.delete("/:notificationId", authenticate, remove);

export default router;
