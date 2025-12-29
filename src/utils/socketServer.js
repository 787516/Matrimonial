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
    // console.log(`⚡ Socket connected: ${socket.id}`);

    // Client should emit 'userOnline' with their userId after connecting
    socket.on("userOnline", ({ userId }) => {
      if (!userId) return;
      socket.userId = userId;
      onlineUsers.add(userId.toString());
      // broadcast updated online users list
      io.emit("getOnlineUsers", Array.from(onlineUsers));
      //  console.log(`👤 User online: ${userId}`);
    });

    // Clean up on disconnect
    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId.toString());
        io.emit("getOnlineUsers", Array.from(onlineUsers));
        //  console.log(`❌ User disconnected: ${socket.userId}`);
      } else {
        console.log(`❌ Socket disconnected: ${socket.id}`);
      }
    });

    // Join a chat room (expects ChatRoom._id from client)
    socket.on("joinChat", async ({ roomId, userId, firstName }) => {
      if (!roomId) return;
      try {
        socket.join(String(roomId));
      } catch (err) {
        console.error("joinChat error:", err);
      }
    });

    // Send a message event
    socket.on("sendMessage", async (data, ack) => {
      try {
        const {
          senderId,
          receiverId,
          message, // frontend uses message
          roomId: providedRoomId, // prefer provided ChatRoom._id
        } = data;

        if (!senderId || !receiverId || !message) {
          console.log("❌ Missing fields:", data);
          return;
        }

        // Determine chatRoom (use provided roomId when available)
        let chatRoom = null;
        if (providedRoomId) {
          chatRoom = await ChatRoom.findById(providedRoomId);
        }

        if (!chatRoom) {
          // fallback: find or create by participants
          chatRoom = await ChatRoom.findOne({
            participants: { $all: [senderId, receiverId] },
          });

          if (!chatRoom) {
            chatRoom = await ChatRoom.create({
              participants: [senderId, receiverId],
            });
          }
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

        // Ensure sender socket is in the room before emitting
        try {
          socket.join(String(chatRoom._id));
        } catch (err) {
          // ignore
        }

        // Emit to room using ChatRoom._id
        io.to(String(chatRoom._id)).emit("messageReceived", payload);

        // Acknowledge to sender with saved message
        if (typeof ack === "function") ack({ data: payload });
      } catch (err) {
        console.error("❌ sendMessage ERROR:", err);
      }
    });

    socket.on("leaveChat", ({ roomId }) => {
      if (!roomId) return;
      try {
        socket.leave(String(roomId));
      } catch (err) {
        // ignore
      }
    });

    // Typing indicator
    socket.on("typing", ({ roomId, userId }) => {
      if (!roomId) return;
      socket.to(String(roomId)).emit("typing", { userId });
    });

    socket.on("stopTyping", ({ roomId, userId }) => {
      if (!roomId) return;
      socket.to(String(roomId)).emit("stopTyping", { userId });
    });
  });

  return io;
};
