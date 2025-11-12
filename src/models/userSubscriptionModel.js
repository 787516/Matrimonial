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
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ["Active", "Expired", "Pending", "Cancelled"],
      default: "Pending",
    },
    paymentInfo: {
      orderId: String,
      paymentId: String,
      signature: String,
      amount: Number,
      currency: String,
    },
  },
  { timestamps: true }
);

const UserSubscription = mongoose.model(
  "UserSubscription",
  userSubscriptionSchema
);
export default UserSubscription;
