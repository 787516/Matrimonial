import express from "express";
import {
  requestEmailChange,
  verifyEmailChange,
  updatePassword,
  deactivateProfile,
  deleteProfile,
} from "../controller/userSettingsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Email update flow
router.post("/request-email-change", authMiddleware, requestEmailChange);
router.post("/verify-email-change", authMiddleware, verifyEmailChange);

// ✅ Password update
router.put("/update-password", authMiddleware, updatePassword);

// ✅ Profile control
router.post("/deactivate", authMiddleware, deactivateProfile);
router.delete("/delete", authMiddleware, deleteProfile);

export default router;
