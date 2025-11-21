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

    // 🔵 PERSONAL DETAILS
    height: { type: Number, min: 100, max: 250 },
    weight: { type: Number, min: 30, max: 200 },
    healthInformation: { type: String, maxlength: 100 },
    anyDisability: { type: String, maxlength: 100 },
    bloodGroup: {
      type: String,
      enum: [
        "A+",
        "A-",
        "B+",
        "B-",
        "O+",
        "O-",
        "AB+",
        "AB-",
        null,
      ],
    },

    diet: { type: String, enum: ["Veg", "Non-Veg", "Eggetarian", "Vegan"] },
    smoking: { type: String, enum: ["No", "Occasionally", "Yes"] },
    drinking: { type: String, enum: ["No", "Occasionally", "Yes"] },

    // 🔵 RELIGION DETAILS
    religion: { type: String, trim: true },
    community: { type: String, trim: true },
    subCommunity: { type: String, trim: true },
    motherTongue: { type: String, trim: true },
    gothra: { type: String, trim: true },

    // 🔵 FAMILY DETAILS
    fatherName: String,
    fatherOccupation: String,
    motherName: String,
    motherOccupation: String,
    noOfBrothers: Number,
    noOfSisters: Number,
    marriedBrothers: Number,
    marriedSisters: Number,
    familyType: { type: String, enum: ["Joint", "Nuclear"] },

    // 🔵 EDUCATION & CAREER
    highestQualification: String,
    workingAs: String,
    companyName: String,
    companyAddress: String,
    income: String,
    workLocation: String,

    // 🔵 ADDRESS
    currentAddress: String,
    nativeAddress: String,

    // 🔵 HOROSCOPE DETAILS
    countryOfBirth: String,
    cityOfBirth: String,
    timeOfBirth: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid HH:MM format"],
    },
    rashi: String,
    nadi: { type: String, enum: ["Adi", "Madhya", "Antya"] },
    gan: String,
    charan: String,
    manglik: { type: String, enum: ["Yes", "No", "Don't Know"] },

    // 🔵 OTHER
    hobbies: [String],
    interests: [String],
    aboutMe: { type: String, maxlength: 500 },

    profilePhoto: {
      type: String,
      validate: (v) => !v || validator.isURL(v),
    },

    profileCompleted: { type: Number, default: 0 },
    isProfileVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("UserProfileDetail", profileSchema);


// const UserProfileDetailModel = mongoose.model("UserProfileDetail", userProfileDetailSchema);
// export default UserProfileDetailModel;
