import crypto from "crypto";
import UserSubscription from "../models/userSubscriptionModel.js";
import SubscriptionPlan from "../models/subscriptionPlanModel.js";

export const razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    const body = req.body; // raw buffer
    const bodyString = body.toString("utf8");

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(bodyString)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.log("❌ Invalid webhook signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = JSON.parse(bodyString);

    console.log("Webhook event:", event.event);

    if (event.event === "payment_link.paid") {
      const paymentLinkId = event.payload.payment_link.entity.id;
      const paymentId = event.payload.payment.entity.id;

      // Find subscription (we saved paymentLinkId earlier)
      const sub = await UserSubscription.findOne({ paymentLinkId }).populate("planId");
      if (!sub) {
        console.log("No subscription found for payment link:", paymentLinkId);
        return res.json({ status: "no_subscription" });
      }

      const duration = sub.planId.durationInDays;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      const updated = await UserSubscription.findOneAndUpdate(
        { _id: sub._id },
        {
          status: "Active",
          paymentId,
          startDate,
          endDate,
        },
        { new: true }
      );

      console.log("✅ Subscription activated:", updated);
    }

    if (event.event === "payment_link.expired") {
      const paymentLinkId = event.payload.payment_link.entity.id;
      await UserSubscription.findOneAndUpdate(
        { paymentLinkId },
        { status: "Expired" }
      );
    }

    if (event.event === "payment_link.cancelled") {
      const paymentLinkId = event.payload.payment_link.entity.id;
      await UserSubscription.findOneAndUpdate(
        { paymentLinkId },
        { status: "Cancelled" }
      );
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.log("Webhook error:", err);
    res.status(500).json({ error: err.message });
  }
};
