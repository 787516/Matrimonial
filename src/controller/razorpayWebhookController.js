import crypto from "crypto";
import UserSubscription from "../models/userSubscriptionModel.js";
import SubscriptionPlan from "../models/subscriptionPlanModel.js";
import sendSubscriptionEmail from "../utils/sendSubscriptionEmail.js";

export const razorpayWebhook = async (req, res) => {
  try {
    console.log("🔥 Webhook hit");

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    const rawBody = req.body.toString("utf8");

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.log("❌ Invalid signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = JSON.parse(rawBody);
    console.log("Webhook event:", event.event);

    if (event.event === "payment_link.paid") {
      const paymentLinkId = event.payload.payment_link.entity.id;
      const paymentId = event.payload.payment.entity.id;

      const sub = await UserSubscription.findOne({ paymentLinkId })
        .populate("planId")
        .populate("userId");

      if (!sub) {
        console.log("❌ No subscription found for", paymentLinkId);
        return res.json({ status: "no_subscription" });
      }

      const duration = sub.planId.durationInDays;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      const updated = await UserSubscription.findByIdAndUpdate(
        sub._id,
        {
          status: "Active",
          paymentId,
          startDate,
          endDate,
        },
        { new: true }
      );
      // 📧 SEND SUBSCRIPTION EMAIL 
      await sendSubscriptionEmail({
        email: sub.userId.email,
        name: sub.userId.firstName || "User",
        planName: sub.planId.name,
        amount: sub.planId.price,
        startDate: startDate.toDateString(),
        endDate: endDate.toDateString(),
        paymentId,
      });
      console.log("✅ Subscription activated & email sent");
      console.log("✅ Subscription activated:", updated);
    }
    return res.json({ status: "ok" });
  } catch (err) {
    console.log("Webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
};
