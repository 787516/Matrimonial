import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);
export default ChatRoom;
