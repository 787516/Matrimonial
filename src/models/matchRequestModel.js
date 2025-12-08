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
      enum: ["Pending", "Accepted", "Rejected", "Blocked", "Cancelled"],
      default: "Pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


// 🔹 Performance Indexes (do NOT change behavior)
matchRequestSchema.index({ senderId: 1, receiverId: 1 });
matchRequestSchema.index({ type: 1, status: 1 });
matchRequestSchema.index({ createdAt: -1 });

const MatchRequestModel = mongoose.model("MatchRequest", matchRequestSchema);
export default MatchRequestModel;
