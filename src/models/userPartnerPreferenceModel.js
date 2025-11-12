import mongoose from "mongoose";
import validator from "validator";

const userPartnerPreferenceSchema = new mongoose.Schema(
  {
    userProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProfileDetail", // FK to UserProfileDetail
      required: true,
      unique: true, // one preference per profile
    },

    ageRange: {
      min: { type: Number, min: 18, max: 80, required: true },
      max: { type: Number, min: 18, max: 80, required: true },
    },

    heightRange: {
      min: { type: Number, min: 100, max: 250 }, // cm
      max: { type: Number, min: 100, max: 250 },
    },

    religion: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    caste: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    education: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    location: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    income: {
      type: String,
      trim: true,
      maxlength: 30,
    },
  },
  { timestamps: true }
);

const UserPartnerPreference = mongoose.model(
  "UserPartnerPreference",
  userPartnerPreferenceSchema
);
export default UserPartnerPreference;
