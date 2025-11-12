import mongoose from "mongoose";
import validator from "validator";

const userPhotoGallerySchema = new mongoose.Schema(
  {
    userProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProfile", // FK to userProfileDetail table
      required: true,
    },

    imageUrl: {
      type: String,
      required: true,
      validate: {
        validator: (v) => validator.isURL(v),
        message: "Invalid image URL format",
      },
    },

    isProfilePhoto: {
      type: Boolean,
      default: false,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const UserPhotoGallery = mongoose.model(
  "UserPhotoGallery",
  userPhotoGallerySchema
);
export default UserPhotoGallery;
