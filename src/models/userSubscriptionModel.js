// models/userSubscriptionModel.js
import mongoose from "mongoose";

const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },

    // Razorpay Payment Link
    paymentLinkId: { type: String }, // from Razorpay
    paymentId: { type: String }, // Razorpay payment id after success

    status: {
      type: String,
      enum: ["Pending", "Active", "Expired", "Cancelled"],
      default: "Pending",
    },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);


userSubscriptionSchema.index(
  { userId: 1 },
  { unique: true }
);

export default mongoose.model("UserSubscription", userSubscriptionSchema);
