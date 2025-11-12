import mongoose from "mongoose";

const matchRequestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["Interest", "Chat", "View"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected", "Blocked"],
      default: "Pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const MatchRequestModel = mongoose.model("MatchRequest", matchRequestSchema);
export default MatchRequestModel;
