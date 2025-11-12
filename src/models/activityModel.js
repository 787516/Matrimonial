import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    // User who performed the action (receiver of the notification)
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true 
    },
    
    // User who triggered the action (sender of the action)
    actorUserId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      index: true
    },
    
    // Type of activity notification
    activityType: {
      type: String,
      enum: [
        // Chat notifications
        "ChatMessageReceived",
        
        // Request/Follow notifications
        "InterestSent",
        "InterestAccepted",
        "InterestRejected",
        "ChatRequestReceived",
        "ChatRequestAccepted",
        "ChatRequestRejected",
        "ProfileViewed",
        "UserBlocked",
      ],
      required: true,
      index: true
    },
    
    // Message or description for the activity
    message: { 
      type: String, 
      trim: true 
    },
    
    // Related data (message ID, request ID, etc.)
    relatedId: { 
      type: mongoose.Schema.Types.ObjectId 
    },
    
    // Mark as read/unread
    isRead: { 
      type: Boolean, 
      default: false,
      index: true
    },
    
    // Additional metadata
    metadata: {
      chatRoomId: mongoose.Schema.Types.ObjectId,
      messageCount: Number,
      requestType: String, // "Interest" or "Chat"
    }
  },
  { timestamps: true }
);

// Compound index for efficient queries
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Activity", activitySchema);
