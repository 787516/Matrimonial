import { razorpayInstance } from "../utils/razorpay.js";
import SubscriptionPlan from "../models/subscriptionPlanModel.js";
import UserSubscription from "../models/userSubscriptionModel.js";

export const createPaymentLink = async (req, res) => {
  try {
    const userId = req.user._id;
    const { planId } = req.body;

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }
    // Create Razorpay payment link
    const paymentLink = await razorpayInstance.paymentLink.create({
      amount: plan.price * 100,
      currency: "INR",
      description: `Payment for ${plan.name} plan`,
      customer: {
        name: req.user.firstName || "User",
        email: req.user.email,
        contact: req.user.phone,
      },
      callback_url: `http://localhost:5173/payment-result`,
      callback_method: "get",
    });

    // ALWAYS create a new subscription record
    // const subscription = await UserSubscription.create({
    //   userId,
    //   planId,
    //   paymentLinkId: paymentLink.id,
    //   status: "Pending",
    // });

//     await UserSubscription.findOneAndUpdate(
//   { userId },
//   {
//     userId,
//     planId,
//     paymentLinkId: paymentLink.id,
//     status: "Pending",
//   },
//   { upsert: true, new: true }
// );
const subscription = await UserSubscription.findOneAndUpdate(
  {
    userId,
    status: { $in: ["Pending", "Active"] }, // important
  },
  {
    userId,
    planId,
    paymentLinkId: paymentLink.id,
    status: "Pending",
  },
  {
    upsert: true,
    new: true,
  }
);



    return res.json({
      success: true,
      paymentLinkUrl: paymentLink.short_url,
      subscriptionId: subscription._id,
    });

  } catch (error) {
    console.error("Error creating payment link:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};


// export const getMySubscription = async (req, res) => {
//   try {
//     const subscription = await UserSubscription.findOne({ userId: req.user._id })
//       .populate("planId");
//     res.json({ subscription });
//   } catch (error) {
//     res.status(500).json({ message: "Something went wrong" });
//   }
// };


export const getMySubscription = async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({
      userId: req.user._id,
      status: "Active",
    }).populate("planId");

    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ message: error.message });
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


