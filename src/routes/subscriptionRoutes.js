import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createOrder,
  verifyPayment,
  getMySubscription,
} from "../controller/subscriptionController.js";

const router = express.Router();

router.post("/create-order", authMiddleware, createOrder);
router.post("/verify-payment", authMiddleware, verifyPayment);
router.get("/my-subscription", authMiddleware, getMySubscription);

export default router;
