import { razorpayInstance } from "../utils/razorpay.js";
import SubscriptionPlan from "../models/subscriptionPlanModel.js";
import UserSubscription from "../models/userSubscriptionModel.js";

export const createPaymentLink = async (req, res) => {
  try {
    
    const userId = req.user._id; // from your auth middleware
    const { planId } = req.body;

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    // 1. Create payment link on Razorpay
    const paymentLink = await razorpayInstance.paymentLink.create({
      amount: plan.price * 100, // INR → paise
      currency: "INR",
      description: `Payment for ${plan.name} plan`,
      customer: {
        name: req.user.firstName || "User",
        email: req.user.email,
        contact: req.user.phone, // make sure you store this
      },
      callback_url: `http://localhost:5173/payment-result`,
      callback_method: "get",
    });

    // 2. Create or update a subscription record with Pending status
    const subscription = await UserSubscription.findOneAndUpdate(
      { userId, planId, status: "Pending" },
      {
        userId,
        planId,
        paymentLinkId: paymentLink.id,
        status: "Pending",
      },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      paymentLinkUrl: paymentLink.short_url,
      subscriptionId: subscription._id,
    });
       console.log("▶️ createPaymentLink CALLED");
    console.log("Received planId:", req.body.planId);
    console.log("User:", req.user);
  } catch (error) {
    console.error("Error creating payment link:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const getMySubscription = async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({ userId: req.user._id })
      .populate("planId");

    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};



// GET all plans
export const getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({});
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


