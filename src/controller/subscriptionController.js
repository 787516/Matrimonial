import { razorpayInstance } from "../utils/razorpay.js";
import SubscriptionPlan from "../models/subscriptionPlanModel.js";
import UserSubscription from "../models/userSubscriptionModel.js";
import crypto from "crypto";

// 1️⃣ Create Razorpay order
export const createOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const options = {
      amount: plan.price * 100, // amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpayInstance.orders.create(options);

    const subscription = await UserSubscription.create({
      userId: req.user._id,
      planId,
      paymentInfo: { orderId: order.id, amount: plan.price, currency: "INR" },
    });

    res.json({ order, subscription });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: error.message });
  }
};

// 2️⃣ Verify payment signature
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user._id;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      const subscription = await UserSubscription.findOneAndUpdate(
        { userId, "paymentInfo.orderId": razorpay_order_id },
        {
          $set: {
            "paymentInfo.paymentId": razorpay_payment_id,
            "paymentInfo.signature": razorpay_signature,
            status: "Active",
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)), // 6-month default
          },
        },
        { new: true }
      );

      res.json({ message: "Payment verified", subscription });
    } else {
      res.status(400).json({ message: "Invalid signature" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3️⃣ Get user’s current subscription
export const getMySubscription = async (req, res) => {
  const subscription = await UserSubscription.findOne({ userId: req.user._id })
    .populate("planId", "name price validityMonths benefits");

  res.json({ subscription });
};
