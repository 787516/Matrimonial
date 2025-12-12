import mongoose from "mongoose";
import validator from "validator";

const allowedProfileFor = [
  "self",
  "son",
  "daughter",
  "sibling",
  "relative",
  "friend",
  "other",
];

const allowedCreatedBy = [
  "self",
  "parent",
  "sibling",
  "relative",
  "friend",
  "other",
];

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    /* ----------------------------------------------------
       BASIC INFO
    ---------------------------------------------------- */

    profileFor: {
      type: String,
      trim: true,
      lowercase: true,
      default: "self",
      validate: {
        validator: function (v) {
          return allowedProfileFor.includes(String(v).toLowerCase().trim());
        },
        message:
          "Invalid profileFor. Allowed: Self, Son, Daughter, Sibling, Relative, Friend, Other",
      },
    },

    profileCreatedBy: {
      type: String,
      trim: true,
      lowercase: true,
      default: "self",
      validate: {
        validator: function (v) {
          return allowedCreatedBy.includes(String(v).toLowerCase().trim());
        },
        message:
          "Invalid profileCreatedBy. Allowed: Self, Parent, Sibling, Relative, Friend, Other",
      },
    },

    gender: {
      type: String,
      trim: true,
      lowercase: true,
    },

    dateOfBirth: {
      type: Date,
      required: false,
    },

    maritalStatus: {
      type: String,
      trim: true,
      lowercase: true,
    },

    height: { type: Number, min: 100, max: 250 },
    weight: { type: Number, min: 30, max: 200 },

    complexion: { type: String, trim: true, lowercase: true },
    bodyType: { type: String, trim: true, lowercase: true },

    hairColor: { type: String, trim: true },
    eyeColor: { type: String, trim: true },

    healthInformation: { type: String, maxlength: 200 },

    anyDisability: { type: String, maxlength: 100 },
    disabilityType: { type: String, maxlength: 150 },
    disabilityDetails: { type: String, maxlength: 400 },
    affectsDailyLife: { type: Boolean, default: false },

    bloodGroup: { type: String, trim: true },

    diet: { type: String, trim: true, lowercase: true },

    smoking: { type: String, trim: true, lowercase: true,  },
    drinking: { type: String, trim: true, lowercase: true,  },

    /* ----------------------------------------------------
       FAMILY
    ---------------------------------------------------- */
    fatherName: { type: String, trim: true },
    fatherOccupation: { type: String, trim: true },

    motherName: { type: String, trim: true },
    motherOccupation: { type: String, trim: true },

    noOfBrothers: { type: Number, min: 0, max: 15 },
    marriedBrothers: { type: Number, min: 0, max: 15 },

    noOfSisters: { type: Number, min: 0, max: 15 },
    marriedSisters: { type: Number, min: 0, max: 15 },

    familyType: { type: String, trim: true, lowercase: true,  },

    /* ----------------------------------------------------
       RELIGIOUS
    ---------------------------------------------------- */
    religion: { type: String, trim: true },
    community: { type: String, trim: true },
    subCommunity: { type: String, trim: true },
    subCaste: { type: String, trim: true },
    motherTongue: { type: String, trim: true },
    gothra: { type: String, trim: true },

    /* ----------------------------------------------------
       EDUCATION & CAREER
    ---------------------------------------------------- */
    highestQualification: { type: String, trim: true },
    course: { type: String, trim: true },
    collegeName: { type: String, trim: true },

    workingWith: { type: String, trim: true, lowercase: true },
    designation: { type: String, trim: true },
    companyName: { type: String, trim: true },

    annualIncome: { type: String, trim: true },

    businessType: { type: String, trim: true },
    businessName: { type: String, trim: true },
    businessYears: { type: String, trim: true },
    businessLocation: { type: String, trim: true },

    /* ----------------------------------------------------
       LOCATION
    ---------------------------------------------------- */
    country: { type: String, trim: true, lowercase: true },
    state: { type: String, trim: true, lowercase: true },
    city: { type: String, trim: true, lowercase: true },

    area: { type: String, trim: true, lowercase: true },
    pincode: { type: String, trim: true },

    residencyStatus: { type: String, trim: true, lowercase: true },

    permanentAddress: { type: String },
    residentialAddress: { type: String },

    /* ----------------------------------------------------
       HOROSCOPE
    ---------------------------------------------------- */
    countryOfBirth: { type: String, trim: true },
    cityOfBirth: { type: String, trim: true },

    birthHour: { type: Number, min: 0, max: 12 },
    birthMinute: { type: Number, min: 0, max: 59 },
    birthAmPm: { type: String, trim: true, lowercase: true },

    timeOfBirth: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format HH:MM"],
    },

    rashi: { type: String, trim: true },
    nadi: { type: String, trim: true, lowercase: true },
    gan: { type: String, trim: true },
    charan: { type: String, trim: true },
    manglik: { type: String, trim: true, lowercase: true, default: "don't know" },

    /* ----------------------------------------------------
       LIFESTYLE
    ---------------------------------------------------- */
    hobbies: { type: [String], default: [] },
    favouriteCuisine: { type: String, trim: true },
    favouriteMusic: { type: String, trim: true },

    /* ----------------------------------------------------
       ABOUT
    ---------------------------------------------------- */
    shortIntro: { type: String, maxlength: 300 },
    aboutMe: { type: String, maxlength: 2000 },
    partnerExpectation: { type: String, maxlength: 1000 },

    /* ----------------------------------------------------
       PHOTOS
    ---------------------------------------------------- */
    profilePhoto: {
      type: String,
      validate: (v) => !v || validator.isURL(v),
    },

    profileCompleted: { type: Number, default: 0 },
    isProfileVisible: { type: Boolean, default: true },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedFromIP: { type: String },
  },
  { timestamps: true }
);

// Normalize everything before saving
profileSchema.pre("save", function (next) {
  if (this.profileFor) this.profileFor = this.profileFor.toLowerCase().trim();
  if (this.profileCreatedBy)this.profileCreatedBy = this.profileCreatedBy.toLowerCase().trim();
  if (this.gender) this.gender = this.gender.toLowerCase().trim();
  if (this.country) this.country = this.country.toLowerCase().trim();
  if (this.state) this.state = this.state.toLowerCase().trim();
  if (this.city) this.city = this.city.toLowerCase().trim();
  if (this.area) this.area = this.area.toLowerCase().trim();
  next();
});

export default mongoose.model("UserProfileDetail", profileSchema);
