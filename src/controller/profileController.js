import UserProfileDetail from "../models/userProfileDetailModel.js";
import User from "../models/userModel.js";
import UserPartnerPreference from "../models/userPartnerPreferenceModel.js";
import UserPhotoGallery from "../models/userPhotoGalleryModel.js";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// ✅ Fetch complete user profile (joins User + Profile)
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    const profile = await UserProfileDetail.findOne({ userId })
      .populate("userId", "firstName lastName email phone gender dateOfBirth maritalStatus");

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.status(200).json({ message: "Profile fetched successfully", profile });
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" , error: error.message});
  }
};

// ✅ Create or Update Profile
export const updateUserProfile = async (req, res) => {
  console.log("🔄 Update Profile Request Body:", req.body);
  try {
    const userId = req.user._id;
    const updates = req.body;

    let profile = await UserProfileDetail.findOne({ userId });

    if (!profile) {
      profile = new UserProfileDetail({ userId, ...updates });
    } else {
      Object.assign(profile, updates);
    }

    // Calculate profile completion %
    profile.profileCompleted = calculateProfileCompletion(profile);
    await profile.save();

    res.status(200).json({
      message: "Profile updated successfully",
      profileCompleted: profile.profileCompleted,
      profile,
    });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// ✅ Calculate profile completion %
function calculateProfileCompletion(profile) {
  const fields = [
    profile.height,
    profile.weight,
    profile.education,
    profile.employment,
    profile.salary,
    profile.location,
    profile.religion,
    profile.caste,
    profile.fatherOccupation,

  ];

  const filled = fields.filter((val) => val && val !== "").length;
  return Math.round((filled / fields.length) * 100);
}


// ✅ Create / Update Partner Preference
export const upsertPartnerPreference = async (req, res) => {
  try {
    const userProfileId = req.user.profileId; // from auth middleware
    const data = req.body;

    const preference = await UserPartnerPreference.findOneAndUpdate(
      { userProfileId },
      { ...data },
      { upsert: true, new: true }
    );

    res.json({ message: "Preferences saved successfully", preference });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Add Photo
// export const addPhoto = async (req, res) => {
  
//   try {
//     const userProfileId = req.user._id;
//     const { imageUrl, isProfilePhoto } = req.body;
     
//     const photo = await UserPhotoGallery.create({
//       userProfileId,
//       imageUrl,
//       isProfilePhoto,
//     });
    
//     res.status(201).json({ message: "Photo uploaded", photo });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


// ✅ Add or Upload Photo with Cloudinary
export const addPhoto = async (req, res) => {
  
  try {
    const userProfileId = req.user._id;

    // Always safe – prevents undefined errors
    const body = req.body || {};

    let isProfilePhoto =
      body.isProfilePhoto === "true" || body.isProfilePhoto === true;

    let finalImageUrl = null;

    // --------------------------------------
    // CASE 1: FILE UPLOAD (multer + Cloudinary)
    // --------------------------------------
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "matrimony/gallery",
        transformation: [{ width: 800, height: 800, crop: "limit" }],
      });

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      finalImageUrl = uploadResult.secure_url;
    }

    // --------------------------------------
    // CASE 2: DIRECT URL PROVIDED (SAFE ACCESS)
    // --------------------------------------
    else if (body.imageUrl) {
      finalImageUrl = body.imageUrl;
    }

    // --------------------------------------
    // CASE 3: NOTHING PROVIDED
    // --------------------------------------
    else {
      return res.status(400).json({
        message: "No image file or URL provided",
      });
    }

    // --------------------------------------
    // If setting profile photo, remove previous ones
    // --------------------------------------
    if (isProfilePhoto) {
      await UserPhotoGallery.updateMany(
        { userProfileId, isProfilePhoto: true },
        { isProfilePhoto: false }
      );
    }

    // --------------------------------------
    // SAVE IN DB
    // --------------------------------------
    const photo = await UserPhotoGallery.create({
      userProfileId,
      imageUrl: finalImageUrl,
      isProfilePhoto,
    });

    res.status(201).json({
      message: "Photo saved successfully",
      photo,
    });

  } catch (err) {
    console.error("❌ Error adding photo:", err);
    res.status(500).json({ error: err.message });
  }
};


// ✅ Get Gallery
export const getGallery = async (req, res) => {
  try {
    const { userProfileId } = req.params;
     console.log("Fetching gallery for profile ID:", userProfileId);
    // convert to ObjectId
    const objectId = new mongoose.Types.ObjectId(userProfileId);

    const photos = await UserPhotoGallery.find({ userProfileId: objectId });
    res.json({ photos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};