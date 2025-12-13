import express from "express";
import {
  createChatRoom,
  getMessages,
  getChatList,
  deleteMessage,
  deleteChatRoom,
} from "../controller/chatController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// REST Endpoints for chat module
router.post("/room", authMiddleware, createChatRoom);       // Create/get chat room
router.get("/messages/:receiverId", authMiddleware, getMessages); // Fetch chat history
router.get("/list", authMiddleware, getChatList);           // Fetch chat list
router.delete("/message/:messageId", authMiddleware, deleteMessage); // Delete a message
router.delete("/chatroom/:roomId", authMiddleware, deleteChatRoom);


export default router;
