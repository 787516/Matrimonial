import express from "express";
import {
  registerUser,
  loginUser,
  sendOtp,
  verifyOtp,
  setPassword,
  //resetPassword,
  logoutUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
} from "../controller/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Auth Routes
router.post("/register", registerUser);
router.post("/login", loginUser);
//router.post("/send-otp", sendOtp);
router.post("/resend-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/set-password", setPassword);
//router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshAccessToken);
//router.post("/logout", authMiddleware, logoutUser);
router.post("/logout", logoutUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
