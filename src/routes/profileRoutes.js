import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getUserProfile,
  updateUserProfile,
  upsertPartnerPreference,
  addPhoto,
  getGallery,
} from "../controller/profileController.js";
import upload from "../middleware/multer.js"

const router = express.Router();

router.get("/details/:id", authMiddleware, getUserProfile);
router.put("/update", authMiddleware, updateUserProfile);
router.post("/preferences", authMiddleware, upsertPartnerPreference);
router.post("/photos", authMiddleware,upload.single("image"), addPhoto);
router.get("/gallery/:userProfileId", authMiddleware, getGallery);

export default router;
