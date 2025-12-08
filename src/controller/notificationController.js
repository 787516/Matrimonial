import Activity from "../models/activityModel.js";
import User from "../models/userModel.js";
import UserProfileDetail from "../models/userProfileDetailModel.js";
import UserPhotoGallery from "../models/userPhotoGalleryModel.js";
import MatchRequest from "../models/matchRequestModel.js";

/* 🔹 Helper: check if there is any 'Blocked' relationship between 2 users */
const hasBlockedBetween = async (userAId, userBId) => {
  const blocked = await MatchRequest.findOne({
    status: "Blocked",
    $or: [
      { senderId: userAId, receiverId: userBId },
      { senderId: userBId, receiverId: userAId },
    ],
  }).lean();

  return !!blocked;
};

/**
 * ✅ Get all notifications for the logged-in user
 * Supports pagination and filters
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = { userId };
    if (unreadOnly === "true") {
      filter.isRead = false;
    }

    // Fetch notifications with pagination
    let notifications = await Activity.find(filter)
      .populate("actorUserId", "firstName lastName")
      .populate("relatedId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(); // plain objects so we can safely extend

    // 🔥 Attach actor profile photo + derived readAt
    notifications = await Promise.all(
      notifications.map(async (n) => {
        const actor = n.actorUserId;
        let actorProfilePhoto = null;

        if (actor && actor._id) {
          const actorId = actor._id.toString();

          // 1️⃣ Try profile.profilePhoto
          const profile = await UserProfileDetail.findOne({
            userId: actorId,
          }).lean();

          if (profile?.profilePhoto) {
            actorProfilePhoto = profile.profilePhoto;
          } else {
            // 2️⃣ Fallback to gallery profile photo
            const gallery = await UserPhotoGallery.findOne({
              userProfileId: actorId,
              isProfilePhoto: true,
            }).lean();

            if (gallery?.imageUrl) {
              actorProfilePhoto = gallery.imageUrl;
            }
          }
        }

        // Derived readAt: if isRead true, use updatedAt, else null
        const readAt =
          n.isRead && n.updatedAt ? new Date(n.updatedAt) : null;

        return {
          ...n,
          actorProfilePhoto,
          readAt,
        };
      })
    );

    // Get total count + unread count
    const total = await Activity.countDocuments(filter);
    const unreadCount = await Activity.countDocuments({
      userId,
      isRead: false,
    });

    res.status(200).json({
      message: "Notifications fetched successfully",
      total,
      unreadCount,
      page: pageNum,
      limit: limitNum,
      notifications,
    });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

/**
 * ✅ Mark a single notification as read
 * (readAt is derived from updatedAt, no schema change needed)
 */
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Activity.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    )
      .populate("actorUserId", "firstName lastName")
      .lean();

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const readAt =
      notification.isRead && notification.updatedAt
        ? new Date(notification.updatedAt)
        : null;

    res.status(200).json({
      message: "Notification marked as read",
      notification: {
        ...notification,
        readAt,
      },
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
 *
 * Basic fixes:
 *  - Skip if users are blocked
 *  - Avoid duplicate unread notifications for key activity types
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
    if (!userId || !actorUserId || !activityType) {
      console.warn("⚠ createActivity missing required fields");
      return null;
    }

    // 1️⃣ Skip if users are blocked either way
    const blocked = await hasBlockedBetween(userId, actorUserId);
    if (blocked) {
      console.log(
        `⚠ Skipping activity ${activityType} because users ${userId} & ${actorUserId} are blocked`
      );
      return null;
    }

    // 2️⃣ Avoid duplicate unread notifications for some types
    const dedupeTypes = new Set([
      "InterestSent",
      "InterestAccepted",
      "ChatRequestReceived",
      "ChatRequestAccepted",
      "ProfileViewed", // optional: remove if you want every view
    ]);

    if (dedupeTypes.has(activityType)) {
      const existing = await Activity.findOne({
        userId,
        actorUserId,
        activityType,
        relatedId: relatedId || null,
        isRead: false,
      }).lean();

      if (existing) {
        console.log(
          `⚠ Skipping duplicate activity ${activityType} for user ${userId}`
        );
        return existing;
      }
    }

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
    return null;
  }
};
