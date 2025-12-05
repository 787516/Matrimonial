// models/subscriptionPlanModel.js
import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Basic / Standard / Premium
    price: { type: Number, required: true }, // in INR (e.g. 499)
    durationInDays: { type: Number, required: true }, // e.g. 30, 90
    // feature flags if you want
    features: {
      canViewProfiles: { type: Boolean, default: false },
      canChat: { type: Boolean, default: false },
      canViewContactDetails: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export default mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
