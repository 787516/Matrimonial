import crypto from "crypto";
import UserSubscription from "../models/userSubscriptionModel.js";
import sendSubscriptionEmail from "../utils/sendSubscriptionEmail.js";

const generateInvoiceNumber = () => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yyyy}${mm}${dd}-${rand}`;
};

export const razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.body.toString("utf8");

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = JSON.parse(rawBody);

    if (event.event === "payment_link.paid") {
      const paymentLinkId = event.payload.payment_link.entity.id;
      const paymentId = event.payload.payment.entity.id;

      const sub = await UserSubscription.findOne({ paymentLinkId })
        .populate("planId")
        .populate("userId");

      if (!sub) {
        return res.json({ status: "no_subscription" });
      }

      // Dates
      const duration = sub.planId.durationInDays;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      // ✅ GST CALCULATION (FIX)
      const GST_RATE = 0.18;
      const totalAmount = sub.planId.price;

      const baseAmount = +(totalAmount / (1 + GST_RATE)).toFixed(2);
      const taxAmount = +(totalAmount - baseAmount).toFixed(2);
      const taxPercent = 18;

      const invoiceNumber = generateInvoiceNumber();
      const invoiceDate = new Date();

      const updated = await UserSubscription.findByIdAndUpdate(
        sub._id,
        {
          status: "Active",
          paymentId,
          startDate,
          endDate,
          invoiceNumber,
          invoiceDate,
          baseAmount,
          taxAmount,
          taxPercent,
        },
        { new: true }
      );

      // 📧 SEND EMAIL (NOW WITH CORRECT GST)
      await sendSubscriptionEmail({
        email: sub.userId.email,
        name: sub.userId.firstName || "User",
        planName: sub.planId.name,
        amount: totalAmount,
        startDate: startDate.toDateString(),
        endDate: endDate.toDateString(),
        paymentId,
        invoiceNumber,
        invoiceDate: invoiceDate.toDateString(),
        baseAmount,
        taxAmount,
        gstEnabled: true,
        gstRate: GST_RATE,
      });

      console.log("✅ Subscription activated & email sent", updated);
    }

    return res.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
};
