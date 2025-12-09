// models/userModel.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";

// Optional: allowed values (NOT enums – just for our own validation/messages)
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

const userSchema = new mongoose.Schema(
  {
    profileFor: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          if (!v) return false;
          const val = String(v).toLowerCase().trim();
          return ALLOWED_PROFILE_FOR.includes(val);
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

    lastName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: [2, "Last name too short"],
      maxlength: [50, "Last name too long"],
    },

    middleName: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      minlength: [1, "Middle name too short"],
      maxlength: [50, "Middle name too long"],
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
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
      unique: true,
      validate(value) {
        if (!validator.isMobilePhone(value, "any")) {
          throw new Error("Invalid phone number");
        }
      },
    },

    password: {
      type: String,
      required: false, // we set later in setPassword / resetPassword
      select: false,
    },

    gender: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return false;
          const val = String(v).toLowerCase().trim();
          return ALLOWED_GENDER.includes(val);
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
      // ❗ No enum – free string but still required
    },

    // Quick search fields
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

    // Verification & Security
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },

    otp: { type: String },
    otpExpiry: { type: Date },

    // Account status & Role – NO enums to avoid issues
    role: {
      type: String,
      default: "User",
      trim: true,
    },

    status: {
      type: String,
      default: "PendingPassword", // PendingPassword, Active, Blocked, etc.
      trim: true,
    },

    profileCompleted: {
      type: Number,
      default: 0,
    },

    // For email change flow
    pendingEmail: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Invalid email format for pending email",
      },
    },

    emailChangeOtp: {
      type: String,
      minlength: [4, "OTP must be at least 4 characters"],
      maxlength: [8, "OTP cannot exceed 8 characters"],
      match: [/^[0-9]+$/, "OTP must contain only digits"],
      trim: true,
    },

    emailChangeOtpExpiry: {
      type: Date,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return v > Date.now();
        },
        message: "OTP expiry must be a future date",
      },
    },

    deactivation: {
      isDeactivated: { type: Boolean, default: false },
      reason: { type: String },
      deactivateUntil: { type: Date },
    },

    registrationId: {
      type: String,
      unique: true,
    },
    profileViewCount: { type: Number, default: 0 },


    deleteReason: {
      reason: { type: String },
      details: { type: String },
      deletedAt: { type: Date },
    },

    refreshToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// ✅ JWT Token
userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, role: this.role },
    // process.env.JWT_SECRET,
    "Smp346##",
    { expiresIn: "1d" }
  );
  return token;
};

// ✅ Hash password before save
userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    const alreadyHashed =
      typeof this.password === "string" &&
      /^\$2[aby]\$\d{2}\$/.test(this.password);

    if (!alreadyHashed) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
  next();
});

// ✅ Compare passwords
userSchema.methods.validatePassword = async function (plainPassword) {
  if (!this.password) return false; // handle users with no password yet
  return await bcrypt.compare(plainPassword, this.password);
};

// ✅ Hide sensitive data in API response
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpiry;
  return obj;
};

const UserModel = mongoose.model("User", userSchema);
export default UserModel;
