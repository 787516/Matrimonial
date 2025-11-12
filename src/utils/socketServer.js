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

  io.on("connection", (socket) => {
    console.log(`⚡ User connected: ${socket.id}`);

    // 🔹 User joins a chat room
    socket.on("joinChat", async ({ firstName, userId, targetUserId }) => {
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.join(roomId);
      console.log(`${firstName} joined Room: ${roomId}`);
    });

    // 🔹 Send a message event
    socket.on(
      "sendMessage",
      async ({ firstName, lastName, userId, targetUserId, text }) => {
        try {
          const roomId = getSecretRoomId(userId, targetUserId);

          // Find or create chat room
          let chatRoom = await ChatRoom.findOne({
            participants: { $all: [userId, targetUserId] },
          });

          if (!chatRoom) {
            chatRoom = await ChatRoom.create({
              participants: [userId, targetUserId],
            });
          }

          // Save message to DB
          const message = await Message.create({
            chatRoomId: chatRoom._id,
            senderId: userId,
            message: text,
          });

          // ✅ Log activity for receiver
          const senderName = `${firstName} ${lastName}`;
          await createActivity(
            targetUserId,
            userId,
            "ChatMessageReceived",
            `${senderName} sent you a message`,
            message._id,
            { chatRoomId: chatRoom._id }
          );

          // Emit to both users in the room
          io.to(roomId).emit("messageReceived", {
            senderName,
            senderId: userId,
            text,
            createdAt: message.createdAt,
          });

          console.log(`💬 Message sent in room ${roomId}: ${text}`);
        } catch (err) {
          console.error("❌ Message error:", err);
        }
      }
    );

    // 🔹 Typing indicator (optional)
    socket.on("typing", ({ userId, targetUserId }) => {
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.to(roomId).emit("typing", { userId });
    });

    // 🔹 Stop typing indicator
    socket.on("stopTyping", ({ userId, targetUserId }) => {
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.to(roomId).emit("stopTyping", { userId });
    });

    // 🔹 Disconnect
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });

  return io;
};
