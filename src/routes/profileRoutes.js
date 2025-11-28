import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getUserProfile,
  updateUserProfile,
  upsertPartnerPreference,
  getPartnerPreference,
  addPhoto,
  getGallery,
  deletePhoto,
} from "../controller/profileController.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.get("/details/:id", authMiddleware, getUserProfile);
router.put("/update", authMiddleware, updateUserProfile);
router.post("/preferences", authMiddleware, upsertPartnerPreference);
router.get("/preferences", authMiddleware, getPartnerPreference);
// router.post("/photos", authMiddleware,upload.array("images", 6), addPhoto);
router.post("/photos", upload.array("images", 6),authMiddleware,addPhoto);
router.get("/gallery/:userProfileId", authMiddleware, getGallery);
router.delete("/gallery/:photoId", authMiddleware, deletePhoto);

export default router;
