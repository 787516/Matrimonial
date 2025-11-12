import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
