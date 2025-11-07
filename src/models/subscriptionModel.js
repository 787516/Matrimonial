import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  planType: { type: String, enum: ["Free", "Silver", "Gold", "Platinum"], default: "Free" },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  paymentStatus: { type: String, enum: ["Pending", "Completed"], default: "Pending" },
  transactionId: { type: String },
});

export default mongoose.model("Subscription", subscriptionSchema);
