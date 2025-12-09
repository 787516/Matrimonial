import { Server } from "socket.io";
import crypto from "crypto";
import ChatRoom from "../models/chatRoomModel.js";
import Message from "../models/messageModel.js";
import { createActivity } from "../controller/notificationController.js"; // 👈 Import activity logger

/**
 * Helper to create unique room ID for 2 users
 */
const getSecretRoomId = (userId, targetUserId) => {
  return crypto
    .createHash("sha256")
    .update([userId, targetUserId].sort().join("$"))
    .digest("hex");
};

/**
 * Initialize Socket.IO server
 */

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Track online users (by userId)
  const onlineUsers = new Set();

  io.on("connection", (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    // Client should emit 'userOnline' with their userId after connecting
    socket.on("userOnline", ({ userId }) => {
      if (!userId) return;
      socket.userId = userId;
      onlineUsers.add(userId.toString());
      // broadcast updated online users list
      io.emit("getOnlineUsers", Array.from(onlineUsers));
      console.log(`👤 User online: ${userId}`);
    });

    // Clean up on disconnect
    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId.toString());
        io.emit("getOnlineUsers", Array.from(onlineUsers));
        console.log(`❌ User disconnected: ${socket.userId}`);
      } else {
        console.log(`❌ Socket disconnected: ${socket.id}`);
      }
    });

    // Join a chat room
    socket.on("joinChat", async ({ firstName, userId, targetUserId }) => {
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.join(roomId);
      console.log(`${firstName || userId} joined Room: ${roomId}`);
    });

    // Send a message event
socket.on("sendMessage", async (data) => {
  try {
    const {
      senderId,
      receiverId,
      message, // frontend uses message
      roomId: ignoredRoomId, // not used because we compute our own
    } = data;

    if (!senderId || !receiverId || !message) {
      console.log("❌ Missing fields:", data);
      return;
    }

    // Generate correct roomId
    const roomId = getSecretRoomId(senderId, receiverId);

    // Find or create chat room
    let chatRoom = await ChatRoom.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        participants: [senderId, receiverId],
      });
    }
    // Save message in DB
    const newMsg = await Message.create({
      chatRoomId: chatRoom._id,
      senderId,
      receiverId,
      message,
    });

    const payload = {
      _id: newMsg._id,
      chatRoomId: newMsg.chatRoomId,
      senderId: newMsg.senderId,
      receiverId: newMsg.receiverId,
      message: newMsg.message,
      createdAt: newMsg.createdAt,
    };

    // Emit to room
    io.to(roomId).emit("messageReceived", payload);

    //console.log("💬 Message saved & emitted:", payload);
  } catch (err) {
    console.error("❌ sendMessage ERROR:", err);
  }
});


    // Typing indicator
    socket.on("typing", ({ userId, targetUserId }) => {
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.to(roomId).emit("typing", { userId });
    });

    socket.on("stopTyping", ({ userId, targetUserId }) => {
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.to(roomId).emit("stopTyping", { userId });
    });
  });

  return io;
};
