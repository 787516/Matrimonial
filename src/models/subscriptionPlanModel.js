import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    durationInDays: { type: Number, required: true },

    features: {
      canViewContacts: { type: Boolean, default: false },

      // use Mixed so string/numbers both allowed
      maxProfileViews: { 
        type: mongoose.Schema.Types.Mixed,
        default: 0 
      },

      unlimitedProfileViews: { type: Boolean, default: false },

      chatAllowed: { type: Boolean, default: false },
      unlimitedInterest: { type: Boolean, default: false },

      supportLevel: {
        type: String,
        enum: ["Basic", "Advanced", "Dedicated"],
        default: "Basic",
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("SubscriptionPlan", subscriptionPlanSchema);



