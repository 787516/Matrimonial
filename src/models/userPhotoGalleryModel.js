import mongoose from "mongoose";

const gallerySchema = new mongoose.Schema(
  {
    userProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProfileDetail",
      required: true,
    },

    imageUrl: {
      type: String,
      required: true,
    },

    isProfilePhoto: {
      type: Boolean,
      default: false,
    },

    visibility: {
      type: String,
      enum: ["public", "premium", "hidden"],
      default: "public",
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("UserPhotoGallery", gallerySchema);


// const UserPhotoGallery = mongoose.model(
//   "UserPhotoGallery",
//   userPhotoGallerySchema
// );
// export default UserPhotoGallery;
