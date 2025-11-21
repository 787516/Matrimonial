import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    planId: {
      type: String,
      enum: ["FREE", "SILVER", "GOLD", "PLATINUM"],
      required: true,
    },

    price: Number,
    durationDays: Number,

    // FEATURES
    viewLimit: Number,
    contactViewAllowed: Boolean,
    chatAllowed: Boolean,
    interestLimit: { type: String, enum: ["Limited", "Unlimited"] },
    supportType: { type: String, enum: ["None", "Basic", "Advance"] },

    // VALIDITY
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("userSubscription", subscriptionSchema);
