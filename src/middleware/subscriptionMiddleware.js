import UserSubscription from "../models/userSubscriptionModel.js";
import SubscriptionPlan from "../models/subscriptionPlanModel.js";

export const subscriptionMiddleware = async (req, res, next) => {
  try {
    const now = new Date();

    // 1️⃣ Check active paid subscription
    let subscription = await UserSubscription
      .findOne({
        userId: req.user._id,
        status: "Active",
        endDate: { $gte: now },
      })
      .populate("planId");

    // 2️⃣ If no active subscription → assign FREE PLAN
    if (!subscription) {
      const freePlan = await SubscriptionPlan.findOne({ name: "FREE" });

      if (!freePlan) {
        return res.status(500).json({ message: "FREE plan missing in DB" });
      }

      subscription = {
        planId: freePlan,       // behaves like normal subscription
        isFreePlan: true        // optional flag
      };
    }

    req.subscription = subscription;
    next();

  } catch (err) {
    console.log("Subscription middleware error:", err);
    return res.status(500).json({ message: "Subscription check failed" });
  }
};
