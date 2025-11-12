import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadCount,
} from "../controller/notificationController.js";

const router = express.Router();

// ✅ Get all notifications for user
router.get("/all", authMiddleware, getNotifications);

// ✅ Get unread notification count
router.get("/unread/count", authMiddleware, getUnreadCount);

// ✅ Mark a notification as read
router.put("/:notificationId/read", authMiddleware, markAsRead);

// ✅ Mark all notifications as read
router.put("/read/all", authMiddleware, markAllAsRead);

// ✅ Delete a single notification
router.delete("/:notificationId", authMiddleware, deleteNotification);

// ✅ Clear all notifications
router.delete("/clear/all", authMiddleware, clearAllNotifications);

export default router;
