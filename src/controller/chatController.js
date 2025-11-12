import ChatRoom from "../models/chatRoomModel.js";
import Message from "../models/messageModel.js";
import { createActivity } from "./notificationController.js"; // 👈 Import activity logger

/**
 * Create or find chat room
 */
export const createChatRoom = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const userId = req.user._id;

    let room = await ChatRoom.findOne({
      participants: { $all: [userId, receiverId] },
    });

    if (!room) {
      room = await ChatRoom.create({
        participants: [userId, receiverId],
      });
    }

    res.status(201).json({ message: "Chat room ready", chatRoom: room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Fetch messages for a chat room
 */
export const getMessages = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const userId = req.user._id;

    const room = await ChatRoom.findOne({
      participants: { $all: [userId, receiverId] },
    });

    if (!room) return res.status(404).json({ message: "Chat room not found" });

    const messages = await Message.find({ chatRoomId: room._id })
      .sort({ createdAt: 1 })
      .populate("senderId", "firstName lastName");

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get user chat list (recent conversations)
 */
export const getChatList = async (req, res) => {
  try {
    const userId = req.user._id;

    const rooms = await ChatRoom.find({
      participants: userId,
    }).populate("participants", "firstName lastName email");

    const chatList = await Promise.all(
      rooms.map(async (room) => {
        const lastMsg = await Message.findOne({ chatRoomId: room._id })
          .sort({ createdAt: -1 })
          .lean();
        return {
          roomId: room._id,
          participants: room.participants,
          lastMessage: lastMsg?.message || "No messages yet",
          lastMessageAt: lastMsg?.createdAt,
        };
      })
    );

    res.json({ chatList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete a single message
 */
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    await Message.findByIdAndDelete(messageId);
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
