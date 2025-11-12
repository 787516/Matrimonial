import Activity from "../models/activityModel.js";
import User from "../models/userModel.js";

/**
 * ✅ Get all notifications for the logged-in user
 * Supports pagination and filters
 */

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const skip = (page - 1) * limit;

    // Build filter
    const filter = { userId };
    if (unreadOnly === "true") {
      filter.isRead = false;
    }

    // Fetch notifications with pagination
    const notifications = await Activity.find(filter)
      .populate("actorUserId", "firstName lastName")
      .populate("relatedId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Activity.countDocuments(filter);
    const unreadCount = await Activity.countDocuments({ userId, isRead: false });

    res.status(200).json({
      message: "Notifications fetched successfully",
      total,
      unreadCount,
      page: parseInt(page),
      limit: parseInt(limit),
      notifications,
    });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

/**
 * ✅ Mark a single notification as read
 */
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Activity.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    ).populate("actorUserId", "firstName lastName");

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
};

/**
 * ✅ Mark all notifications as read for a user
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Activity.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ Error marking all notifications as read:", error);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
};

/**
 * ✅ Delete a single notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const result = await Activity.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!result) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting notification:", error);
    res.status(500).json({ error: "Failed to delete notification" });
  }
};

/**
 * ✅ Clear all notifications for a user
 */
export const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Activity.deleteMany({ userId });

    res.status(200).json({
      message: "All notifications cleared",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("❌ Error clearing all notifications:", error);
    res.status(500).json({ error: "Failed to clear all notifications" });
  }
};

/**
 * ✅ Get unread notification count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Activity.countDocuments({
      userId,
      isRead: false,
    });

    res.status(200).json({
      unreadCount,
    });
  } catch (error) {
    console.error("❌ Error getting unread count:", error);
    res.status(500).json({ error: "Failed to get unread count" });
  }
};

/**
 * ✅ Internal helper function to create an activity/notification
 * This should be called from other controllers when actions occur
 */
export const createActivity = async (
  userId,
  actorUserId,
  activityType,
  message,
  relatedId = null,
  metadata = {}
) => {
  try {
    const activity = await Activity.create({
      userId,
      actorUserId,
      activityType,
      message,
      relatedId,
      metadata,
      isRead: false,
    });

    console.log(`✅ Activity logged: ${activityType} for user ${userId}`);
    return activity;
  } catch (error) {
    console.error("❌ Error creating activity:", error);
  }
};
