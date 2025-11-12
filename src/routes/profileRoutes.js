import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getUserProfile,
  updateUserProfile,
  upsertPartnerPreference,
  addPhoto,
  getGallery,
} from "../controller/profileController.js";

const router = express.Router();

router.get("/details/:id", authMiddleware, getUserProfile);
router.put("/update", authMiddleware, updateUserProfile);
router.post("/preferences", authMiddleware, upsertPartnerPreference);
router.post("/photos", authMiddleware, addPhoto);
router.get("/gallery/:userProfileId", authMiddleware, getGallery);

export default router;
