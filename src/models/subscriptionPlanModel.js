import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    contactLimit: { type: Number, required: true },
    validityMonths: { type: Number, required: true },
    benefits: [{ type: String }], // e.g., ["SMS Alerts", "View Unlimited Profiles"]
  },
  { timestamps: true }
);

const SubscriptionPlan = mongoose.model(
  "SubscriptionPlan",
  subscriptionPlanSchema
);
export default SubscriptionPlan;
