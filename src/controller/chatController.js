// controllers/chatController.js

import ChatRoom from "../models/chatRoomModel.js";
import Message from "../models/messageModel.js";
import MatchRequest from "../models/matchRequestModel.js"; // ✅ for Interest / Chat status
import { createActivity } from "./notificationController.js";
import UserProfileDetail from "../models/userProfileDetailModel.js";
import UserPhotoGallery from "../models/userPhotoGalleryModel.js";
import { getIO } from "../utils/socketServer.js";

// 🔹 Helper: check if there is any 'Blocked' relationship between 2 users
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

// 🔹 Helper: Hybrid chat permission (Option C)
// Chat allowed if:
//  - Interest (type: "Interest") Accepted
//  - OR Chat request (type: "Chat") Accepted
const hasChatPermissionBetween = async (userAId, userBId) => {
  const allowed = await MatchRequest.findOne({
    status: "Accepted",
    type: { $in: ["Interest", "Chat"] },
    $or: [
      { senderId: userAId, receiverId: userBId },
      { senderId: userBId, receiverId: userAId },
    ],
  }).lean();

  return !!allowed;
};

/**
 * Create or find chat room
 * Rules:
 *  - Cannot chat with self
 *  - If room already exists → return it (unless blocked)
 *  - If room does NOT exist → only create if:
 *      - NOT blocked
 *      - Interest Accepted OR Chat Request Accepted (Hybrid rule)
 */
export const createChatRoom = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const userId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({ message: "receiverId is required" });
    }

    if (userId.toString() === receiverId.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot start a chat with yourself" });
    }

    // 1️⃣ Check if already blocked either way
    const blocked = await hasBlockedBetween(userId, receiverId);
    if (blocked) {
      return res.status(403).json({
        message: "You cannot start a chat with this user",
      });
    }

    // 2️⃣ Check if room already exists
    let room = await ChatRoom.findOne({
      participants: { $all: [userId, receiverId] },
    });

    // 2A. If room exists → return it (do not block existing old rooms)
    if (room) {
      return res.status(201).json({ message: "Chat room ready", data: room });
    }

    // 3️⃣ New room: enforce chat permission (Hybrid rule)
    const hasPermission = await hasChatPermissionBetween(userId, receiverId);
    if (!hasPermission) {
      return res.status(403).json({
        message:
          "You can chat only after your interest or chat request is accepted",
      });
    }

    // 4️⃣ Create new room
    room = await ChatRoom.create({
      participants: [userId, receiverId],
    });

    // (Optional) You could log an activity here like "ChatStarted"

    res.status(201).json({ message: "Chat room ready", data: room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Fetch messages for a chat room between logged-in user and receiver
 * Rules:
 *  - Must be participant of the room
 *  - If no room → 404
 *  - (We still allow viewing old messages even if blocked; sending is handled elsewhere)
 */
export const getMessages = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const userId = req.user._id;

    const room = await ChatRoom.findOne({
      participants: { $all: [userId, receiverId] },
    });

    if (!room) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    // Extra safety: ensure user is a participant (should already be due to query)
    const isParticipant = room.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "You are not allowed to view this chat" });
    }

   const messages = await Message.find({
  chatRoomId: room._id,
  deletedFor: { $ne: userId }, // hide messages deleted for this user
})
      .sort({ createdAt: 1 })
      .populate("senderId", "firstName lastName")
      .lean();

    res.json({ data: messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get user chat list (recent conversations)
 * Rules:
 *  - Only rooms where current user is a participant
 *  - Sorted by lastMessageAt (latest first)
 *  - If no messages yet → lastMessage = "No messages yet"
 */


export const getChatList = async (req, res) => {
  try {
    const userId = req.user._id;

    const rooms = await ChatRoom.find({
      participants: userId,
    }).populate(
  "participants",
  "firstName lastName email gender registrationId city"
);


    const chatList = await Promise.all(
      rooms.map(async (room) => {
        const lastMsg = await Message.findOne({ chatRoomId: room._id })
          .sort({ createdAt: -1 })
          .lean();

        // 🔥 Attach profile photos for both participants
        const participantsWithPhotos = await Promise.all(
          room.participants.map(async (p) => {
            const profile = await UserProfileDetail.findOne({
              userId: p._id,
            }).lean();

            let photo = profile?.profilePhoto || null;

            // If no profilePhoto in profile table → get from gallery
            if (!photo) {
              const gallery = await UserPhotoGallery.findOne({
                userProfileId: p._id,
                isProfilePhoto: true,
              }).lean();

              photo = gallery?.imageUrl || null;
            }

            return {
              _id: p._id,
              firstName: p.firstName,
              lastName: p.lastName,
              email: p.email,
              gender: p.gender,
              profilePhoto: photo, // 👉 ADDED HERE
              registrationId: p.registrationId || "—", // ✅ ADDED
              city: p.city || "—",  
              
            };
          })
        );

        return {
          roomId: room._id,
          participants: participantsWithPhotos, // updated
          lastMessage: lastMsg?.message || "No messages yet",
          lastMessageAt: lastMsg?.createdAt || room.createdAt,
        };
      })
    );

    // Sort by latest message
    chatList.sort((a, b) => {
      const tA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tB - tA;
    });

    res.json({ data: chatList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete a single message
 * Rules:
 *  - Only message sender can delete
 *  - Hard delete (global) for now (closest to existing behavior)
 */
// export const deleteMessage = async (req, res) => {
//   try {
//     const { messageId } = req.params;
//     const userId = req.user._id;

//     const msg = await Message.findById(messageId);
//     if (!msg) {
//       return res.status(404).json({ message: "Message not found" });
//     }

//     // Only sender can delete the message
//     if (msg.senderId.toString() !== userId.toString()) {
//       return res
//         .status(403)
//         .json({ message: "You are not allowed to delete this message" });
//     }

//     await Message.findByIdAndDelete(messageId);

//     res.json({ message: "Message deleted" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { type } = req.query; // "me" or "everyone"
    
    const userId = req.user._id;

    const msg = await Message.findById(messageId);
    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }

    // 🔹 DELETE FOR EVERYONE
    if (type === "everyone") {
      if (msg.senderId.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Not allowed" });
      }

      msg.isDeletedForEveryone = true;
      msg.message = "This message was deleted";
      await msg.save();

      // 🔥 Emit live update
      const io = getIO();
      io.to(String(msg.chatRoomId)).emit("messageUpdated", {
        messageId: msg._id,
        isDeletedForEveryone: true,
        message: "This message was deleted",
      });

      return res.json({ message: "Deleted for everyone" });
    }

    // 🔹 DELETE FOR ME
    if (type === "me") {
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { deletedFor: userId },
      });

      return res.json({ message: "Deleted for you" });
    }

    res.status(400).json({ message: "Invalid delete type" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const deleteChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    // Find room
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    // Only participants can delete chat
    const isParticipant = room.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not allowed to delete this chat",
      });
    }

    // Delete all messages in room
    await Message.deleteMany({ chatRoomId: roomId });

    // Delete room
    await ChatRoom.findByIdAndDelete(roomId);

    res.json({ message: "Chat deleted successfully" });
  } catch (err) {
    console.error("Delete chat error:", err);
    res.status(500).json({ error: "Failed to delete chat room" });
  }
};
