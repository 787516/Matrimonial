import mongoose from "mongoose";
import validator from "validator";

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    /* ----------------------------------------------------
       BASIC INFO / EDIT PERSONAL
    ---------------------------------------------------- */
    profileFor: {
      type: String,
      enum: ["Self", "Son", "Daughter", "Sibling", "Relative", "Friend", "Other"],
      default: "Self",
    },

    profileCreatedBy: {
      type: String,
      enum: ["Self", "Parent", "Sibling", "Relative", "Friend", "Other"],
      default: "Self",
    },

    // gender: { type: String, enum: ["Male", "Female", "Other"] },
    gender: { type: String, trim: true },


    dateOfBirth: {
      type: Date,
      required: false,
    },

    // maritalStatus: {
    //   type: String,
    //   enum: [
    //     "Never Married",
    //     "Married",
    //     "Divorced",
    //     "Widowed",
    //     "Awaiting Divorce",
    //     "Separated",
    //     "Other",
    //   ],
    //   default: "Never Married",
    // },
    maritalStatus: {
  type: String,
  trim: true,
},


    height: { type: Number, min: 100, max: 250 }, // cm
    weight: { type: Number, min: 30, max: 200 },

    complexion: {
      type: String,
      enum: ["Very Fair", "Fair", "Wheatish", "Dusky", "Dark", "Other"],
    },

    bodyType: {
      type: String,
      enum: ["Slim", "Average", "Athletic", "Heavy", "Other"],
    },

    hairColor: { type: String, trim: true, maxlength: 50 },
    eyeColor: { type: String, trim: true, maxlength: 50 },

    healthInformation: { type: String, maxlength: 200 },

    anyDisability: { type: String, maxlength: 100 },
    disabilityType: { type: String, maxlength: 150 },
    disabilityDetails: { type: String, maxlength: 400 },
    affectsDailyLife: { type: Boolean, default: false },

    bloodGroup: {
      type: String,
      //enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", null],
    },

    diet: {
      type: String,
      //enum: ["Veg", "Non-Veg", "Eggetarian", "Vegan", "Other"],
    },

    smoking: {
      type: String,
     // enum: ["No", "Occasionally", "Yes", "Prefer not to say"],
      default: "No",
      
    },

    drinking: {
      type: String,
     // enum: ["No", "Occasionally", "Yes", "Prefer not to say"],
      default: "No",
    },

    /* ----------------------------------------------------
       FAMILY INFORMATION
    ---------------------------------------------------- */
    fatherName: { type: String, trim: true, maxlength: 80 },
    fatherOccupation: { type: String, trim: true, maxlength: 120 },

    motherName: { type: String, trim: true, maxlength: 80 },
    motherOccupation: { type: String, trim: true, maxlength: 120 },

    noOfBrothers: { type: Number, min: 0, max: 15 },
    marriedBrothers: { type: Number, min: 0, max: 15 },

    noOfSisters: { type: Number, min: 0, max: 15 },
    marriedSisters: { type: Number, min: 0, max: 15 },

    familyType: {
      type: String,
      //enum: ["Joint", "Nuclear", "Other"],
      default: "Nuclear"
      
    },

    /* ----------------------------------------------------
       RELIGIOUS BACKGROUND
    ---------------------------------------------------- */
    religion: { type: String, trim: true, maxlength: 50 },
    community: { type: String, trim: true, maxlength: 80 },
    subCommunity: { type: String, trim: true, maxlength: 80 },
    subCaste: { type: String, trim: true, maxlength: 80 },

    motherTongue: { type: String, trim: true, maxlength: 50 },
    gothra: { type: String, trim: true, maxlength: 80 },

    /* ----------------------------------------------------
       EDUCATION & CAREER
    ---------------------------------------------------- */
    highestQualification: { type: String, trim: true, maxlength: 100 },
    course: { type: String, trim: true, maxlength: 100 },
    collegeName: { type: String, trim: true, maxlength: 150 },

    workingWith: {
      type: String,
      // enum: [
      //   "Pvt. Company",
      //   "MNC",
      //   "Government/PSU",
      //   "Startup",
      //   "Self-employed/Freelance",
      //   "Business",
      //   "NGO",
      //   "Student",
      //   "Not Working",
      //   "Other",
      // ],
    },

    designation: { type: String, trim: true, maxlength: 120 },
    companyName: { type: String, trim: true, maxlength: 150 },

    annualIncome: { type: String, trim: true, maxlength: 50 },

    businessType: { type: String, trim: true, maxlength: 150 },
    businessName: { type: String, trim: true, maxlength: 150 },
    businessYears: { type: String, trim: true, maxlength: 50 },
    businessLocation: { type: String, trim: true, maxlength: 150 },

    /* ----------------------------------------------------
       LOCATION
    ---------------------------------------------------- */
    country: { type: String, trim: true, maxlength: 60 },
    state: { type: String, trim: true, maxlength: 60 },
    city: { type: String, trim: true, maxlength: 60 },

    area: { type: String, trim: true, maxlength: 150 },
    pincode: { type: String, trim: true, maxlength: 10 },

    residencyStatus: {
      type: String,
     // enum: ["Owned", "Rented", "Company Provided", "Family", "PG/Hostel", "Other"],
    },

    permanentAddress: { type: String, maxlength: 500 },
    residentialAddress: { type: String, maxlength: 500 },

    /* ----------------------------------------------------
       HOROSCOPE
    ---------------------------------------------------- */
    countryOfBirth: { type: String, trim: true, maxlength: 60 },
    cityOfBirth: { type: String, trim: true, maxlength: 60 },

    birthHour: { type: Number, min: 0, max: 12 },
    birthMinute: { type: Number, min: 0, max: 59 },
    birthAmPm: { type: String, enum: ["AM", "PM"] },

    timeOfBirth: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format HH:MM"],
    },

    rashi: { type: String, trim: true, maxlength: 50 },
    nadi: { type: String, enum: ["Adi", "Madhya", "Antya"] },
    gan: { type: String, trim: true, maxlength: 50 },
    charan: { type: String, trim: true, maxlength: 50 },
    manglik: {
      type: String,
      enum: ["Yes", "No", "Don't Know"],
      default: "Don't Know",
    },

    /* ----------------------------------------------------
       LIFESTYLE
    ---------------------------------------------------- */
    hobbies: { type: [String], default: [] },
    favouriteCuisine: { type: String, trim: true, maxlength: 120 },
    favouriteMusic: { type: String, trim: true, maxlength: 120 },

    /* ----------------------------------------------------
       ABOUT ME
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

    /* ----------------------------------------------------
       SYSTEM FIELDS
    ---------------------------------------------------- */
    profileCompleted: { type: Number, default: 0 },
    isProfileVisible: { type: Boolean, default: true },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedFromIP: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("UserProfileDetail", profileSchema);
