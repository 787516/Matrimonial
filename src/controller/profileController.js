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
    profile.profileFor,
    profile.profileCreatedBy,
    profile.gender,
    profile.dateOfBirth,
    profile.maritalStatus,
    profile.height,
    profile.weight,
    profile.complexion,
    profile.bodyType,
    profile.diet,
    profile.smoking,
    profile.drinking,
    profile.fatherName,
    profile.fatherOccupation,
    profile.motherName,
    profile.motherOccupation,
    profile.familyType,
    profile.religion,
    profile.community,
    profile.subCommunity,
    profile.motherTongue,
    profile.highestQualification,
    profile.course,
    profile.workingWith,
    profile.designation,
    profile.companyName,
    profile.annualIncome,
    profile.country,
    profile.state,
    profile.city,
    profile.area,
    profile.pincode,
    profile.residencyStatus,
    profile.shortIntro,
    profile.aboutMe,
    profile.partnerExpectation,
  ];

  const filled = fields.filter((v) => v !== null && v !== undefined && v !== "").length;

  return Math.round((filled / fields.length) * 100);
}



// ✅ Create / Update and get Partner Preference
export const upsertPartnerPreference = async (req, res) => {
  try {
    
    const userId = req.user._id;

    const profile = await UserProfileDetail.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: "User profile not found" });
    }

    const userProfileId = profile._id;
    const data = req.body;

    const preference = await UserPartnerPreference.findOneAndUpdate(
      { userProfileId },
      { ...data, userProfileId },
      { new: true, upsert: true }
    );

    res.json({
      message: "Preferences saved successfully",
      preference,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// ✅ Get Partner Preference
export const getPartnerPreference = async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await UserProfileDetail.findOne({ userId });

    if (!profile) {
      return res.status(404).json({ message: "User profile not found" });
    }

    const preference = await UserPartnerPreference.findOne({
      userProfileId: profile._id,
    });

    return res.json({ preference });
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
    const body = req.body || {};

    let isProfilePhoto =
      body.isProfilePhoto === "true" || body.isProfilePhoto === true;

    let uploadedImages = [];

    // -----------------------
    // MULTIPLE FILE UPLOAD
    // -----------------------
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: "matrimony/gallery",
          transformation: [{ width: 800, height: 800, crop: "limit" }],
        });

        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

        uploadedImages.push(uploadResult.secure_url);
      }
    }

    // URL upload fallback
    if (uploadedImages.length === 0 && body.imageUrl) {
      uploadedImages.push(body.imageUrl);
    }

    if (uploadedImages.length === 0) {
      return res.status(400).json({
        message: "No image file or URL provided",
      });
    }

    // If marking as profile photo → reset others
    if (isProfilePhoto) {
      await UserPhotoGallery.updateMany(
        { userProfileId, isProfilePhoto: true },
        { isProfilePhoto: false }
      );
    }

    // save all images
    const photoData = uploadedImages.map((url) => ({
      userProfileId,
      imageUrl: url,
      isProfilePhoto,
    }));

    const savedPhotos = await UserPhotoGallery.insertMany(photoData);

    res.status(201).json({
      message: "Photos uploaded successfully",
      photos: savedPhotos,
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
   
    // convert to ObjectId
    const objectId = new mongoose.Types.ObjectId(userProfileId);

    const photos = await UserPhotoGallery.find({ userProfileId: objectId });
    res.json({ photos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// DELETE PHOTO FROM GALLERY
export const deletePhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    const photoId = req.params.photoId;

    // 1️⃣ Find the photo
    const photo = await UserPhotoGallery.findById(photoId);

    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    // 2️⃣ User can delete ONLY his own photos
    if (photo.userProfileId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    // 3️⃣ Extract Cloudinary public_id from URL
    const parts = photo.imageUrl.split("/");
    const fileName = parts[parts.length - 1];
    const publicId = "matrimony/gallery/" + fileName.split(".")[0]; // remove .jpg/.png
   
    // 4️⃣ Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.log("⚠ Cloudinary delete failed, moving on:", err.message);
    }

    // 5️⃣ Delete from MongoDB
    await photo.deleteOne();

    // 6️⃣ If profile photo deleted → reset another photo as profilePhoto
    if (photo.isProfilePhoto) {
      const anotherPhoto = await UserPhotoGallery.findOne({
        userProfileId: userId,
      });

      if (anotherPhoto) {
        anotherPhoto.isProfilePhoto = true;
        await anotherPhoto.save();
      }
    }

    res.json({ message: "Photo deleted successfully" });

  } catch (err) {
    console.error("❌ Error deleting photo:", err);
    res.status(500).json({ error: err.message });
  }
};
