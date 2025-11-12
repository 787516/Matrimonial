import mongoose from "mongoose";
import validator from "validator";

const userProfileDetailSchema = new mongoose.Schema(
  {
    // Reference to the User model
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One profile per user
    },

    // --- Physical Details ---
    height: {
      type: Number,
      min: [100, "Height must be at least 100 cm"],
      max: [250, "Height cannot exceed 250 cm"],
    },
    weight: {
      type: Number,
      min: [30, "Weight must be at least 30 kg"],
      max: [200, "Weight cannot exceed 200 kg"],
    },
    complexion: {
      type: String,
      enum: ["Fair", "Wheatish", "Dark", "Medium"],
    },
    bodyType: {
      type: String,
      enum: ["Slim", "Average", "Athletic", "Heavy"],
    },

    // --- Religious Details ---
    religion: {
      type: String,
      trim: true,
      maxlength: [30, "Religion name too long"],
    },
    caste: {
      type: String,
      trim: true,
      maxlength: [30, "Caste name too long"],
    },
    subCaste: {
      type: String,
      trim: true,
      maxlength: [30, "Sub-caste name too long"],
    },
    motherTongue: {
      type: String,
      trim: true,
      maxlength: [30, "Mother tongue too long"],
    },

    // --- Contact Info ---
    location: {
      type: String,
      trim: true,
      maxlength: [100, "Location too long"],
    },
    guardianName: {
      type: String,
      trim: true,
      maxlength: [50, "Guardian name too long"],
    },
    guardianRelation: {
      type: String,
      trim: true,
      maxlength: [30, "Relation description too long"],
    },
    guardianPhone: {
      type: String,
      validate: {
        validator: (v) => !v || validator.isMobilePhone(v, "any"),
        message: "Invalid guardian phone number",
      },
    },

    // --- Professional Details ---
    education: {
      type: String,
      trim: true,
      maxlength: [100, "Education info too long"],
    },
    employment: {
      type: String,
      trim: true,
      maxlength: [100, "Employment info too long"],
    },
    salary: {
      type: String,
      trim: true,
      match: [/^[0-9]+(\s?(INR|USD|CAD|GBP))?$/, "Invalid salary format"],
    },

    // --- Family Details ---
    fatherOccupation: {
      type: String,
      trim: true,
      maxlength: [100, "Father occupation too long"],
    },
    motherOccupation: {
      type: String,
      trim: true,
      maxlength: [100, "Mother occupation too long"],
    },
    siblings: {
      type: Number,
      min: [0, "Siblings count cannot be negative"],
      max: [10, "Siblings count seems too high"],
    },

    // --- Lifestyle ---
    diet: {
      type: String,
      enum: ["Vegetarian", "Non-Vegetarian", "Eggetarian", "Vegan"],
    },
    smoking: {
      type: String,
      enum: ["No", "Occasionally", "Yes"],
      default: "No",
    },
    drinking: {
      type: String,
      enum: ["No", "Occasionally", "Yes"],
      default: "No",
    },

    // --- Hobbies ---
    hobbies: {
      type: [String],
      validate: {
        validator: (value) => value.length <= 10,
        message: "You can only add up to 10 hobbies",
      },
    },

    // --- Partner Preferences ---
    // preferences: {
    //   ageRange: {
    //     min: { type: Number, min: 18, max: 80 },
    //     max: { type: Number, min: 18, max: 80 },
    //   },
    //   location: { type: String, trim: true, maxlength: 100 },
    //   religion: { type: String, trim: true },
    //   caste: { type: String, trim: true },
    //   income: { type: String, trim: true },
    //   education: { type: String, trim: true },
    // },

     // --- Horoscope Details ---
    horoscope: {
      matchRequired: { type: Boolean, default: false },
      birthTime: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"],
      },
      birthPlace: { type: String, trim: true, maxlength: 100 },
      cityOfBirth: { type: String, trim: true, maxlength: 100 },
      rashi: { type: String, trim: true, maxlength: 50 },
      nadi: {
        type: String,
        trim: true,
        enum: ["Adi", "Madhya", "Antya"],
        default: "Madhya",
      },
      sunSign: { type: String, trim: true, maxlength: 30 },
      moonSign: { type: String, trim: true, maxlength: 30 },
      manglik: {
        type: String,
        enum: ["Yes", "No", "Partial"],
        default: "No",
      },
    },

    // --- Profile Photo ---
    profilePhoto: {
      type: String,
      validate: {
        validator: (v) => !v || validator.isURL(v),
        message: "Invalid profile photo URL format",
      },
    },

    // --- User Photo Gallery ---
    // userPhotoGallery: [
    //   {
    //     imageUrl: {
    //       type: String,
    //       required: true,
    //       validate: {
    //         validator: (v) => validator.isURL(v),
    //         message: "Invalid image URL format",
    //       },
    //     },
    //     uploadedAt: {
    //       type: Date,
    //       default: Date.now,
    //     },
    //   },
    // ],

    // --- Stats ---
    profileCompleted: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    isProfileVisible: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);


// Virtual field for Partner Preferences
userProfileDetailSchema.virtual("preferences", {
  ref: "UserPartnerPreference",
  localField: "_id",
  foreignField: "userProfileId",
  justOne: true, // one preference per profile
});

// Virtual field for Gallery
userProfileDetailSchema.virtual("gallery", {
  ref: "UserPhotoGallery",
  localField: "_id",
  foreignField: "userProfileId",
});


const UserProfileDetailModel = mongoose.model("UserProfileDetail", userProfileDetailSchema);
export default UserProfileDetailModel;
