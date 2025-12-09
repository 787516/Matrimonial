import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { createPaymentLink, getMySubscription, getPlans} from "../controller/subscriptionController.js";
//import { razorpayWebhook } from "../controller/razorpayWebhookController.js";

const router = express.Router();

router.post("/create-payment-link", authMiddleware, createPaymentLink);
router.get("/me", authMiddleware, getMySubscription);
router.get("/plans", authMiddleware, getPlans )
// Webhook (NO auth middleware)
//router.post("/webhook", razorpayWebhook);

export default router;
