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
      validate: {
        validator: function (v) {
          // Allow Cloudinary URLs, HTTP URLs
          const isHttpUrl =
            /^https?:\/\/[^\s]+$/i.test(v);

          // Allow local system paths including Linux, macOS, Windows
          const isLocalPath =
            /^([a-zA-Z]:)?[\\\/]([^<>:"|?*\n]+[\\\/])*[^<>:"|?*\n]+$/.test(v);

          return isHttpUrl || isLocalPath;
        },
        message: (props) =>
          `${props.value} is not a valid image path or URL!`,
      },
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
