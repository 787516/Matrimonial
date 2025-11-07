import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  target_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: {
    type: String,
    enum: ["Visited", "InterestSent", "InterestAccepted", "Blocked"],
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("ActivityModel", activitySchema);
