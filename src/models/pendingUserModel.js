import mongoose from "mongoose";
import validator from "validator";

// Allowed values (NO ENUM)
const ALLOWED_PROFILE_FOR = [
  "self",
  "son",
  "daughter",
  "brother",
  "sister",
  "friend",
  "relative",
];

const ALLOWED_GENDER = ["male", "female", "other"];

const pendingUserSchema = new mongoose.Schema(
  {
    profileFor: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          const value = String(v).toLowerCase().trim();
          return ALLOWED_PROFILE_FOR.includes(value);
        },
        message:
          "Invalid profileFor. Allowed: Self, Son, Daughter, Brother, Sister, Friend, Relative",
      },
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: [2, "First name too short"],
      maxlength: [50, "First name too long"],
    },

    middleName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: [1, "Middle name too short"],
      maxlength: [50, "Middle name too long"],
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: [2, "Last name too short"],
      maxlength: [50, "Last name too long"],
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid email address");
        }
      },
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      validate(value) {
        if (!validator.isMobilePhone(value, "any")) {
          throw new Error("Invalid phone number");
        }
      },
    },

    gender: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          const value = String(v).toLowerCase().trim();
          return ALLOWED_GENDER.includes(value);
        },
        message: "Invalid gender. Allowed: Male, Female, Other",
      },
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    maritalStatus: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, "Marital status too short"],
      maxlength: [50, "Marital status too long"],
    },

    city: {
      type: String,
      trim: true,
      required: true,
      minlength: [2, "City name too short"],
      maxlength: [100, "City name too long"],
    },

    pincode: {
      type: String,
      trim: true,
      minlength: [2, "Pincode too short"],
      maxlength: [10, "Pincode too long"],
    },

    state: {
      type: String,
      trim: true,
      required: true,
      minlength: [2, "State name too short"],
      maxlength: [100, "State name too long"],
    },

    country: {
      type: String,
      trim: true,
      required: true,
      minlength: [2, "Country name too short"],
      maxlength: [100, "Country name too long"],
    },

    district: {
      type: String,
      trim: true,
      required: true,
      minlength: [2, "District name too short"],
      maxlength: [100, "District name too long"],
    },

    area: {
      type: String,
      trim: true,
      minlength: [2, "Area name too short"],
      maxlength: [100, "Area name too long"],
    },

    otp: { type: String },
    otpExpiry: { type: Date },
  },
  { timestamps: true }
);

// Normalization Middleware
pendingUserSchema.pre("save", function (next) {
  if (this.profileFor) this.profileFor = this.profileFor.toLowerCase().trim();
  if (this.gender) this.gender = this.gender.toLowerCase().trim();
  if (this.firstName) this.firstName = this.firstName.toLowerCase().trim();
  if (this.middleName) this.middleName = this.middleName.toLowerCase().trim();
  if (this.lastName) this.lastName = this.lastName.toLowerCase().trim();
  next();
});

const PendingUser = mongoose.model("PendingUser", pendingUserSchema);
export default PendingUser;
