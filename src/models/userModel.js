import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    profileFor: {
      type: String,
      required: true,
      enum: [
        "Self",
        "Son",
        "Daughter",
        "Brother",
        "Sister",
        "Friend",
        "Relative",
      ],
      trim: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid Email address");
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
      required: true,
      minlength: 6,
      select: false,
    },
    
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    maritalStatus: {
      type: String,
      required: true,
      enum: ["Single", "Divorced", "Widowed"],
    },
    // To show small data on dashboard & match cards
// age: { type: Number, min },   // auto-calc from DOB at pre-save

// For quick search / match listing
// city: { type: String , trim: true , required: true,minlength: [2, "City name too short"], maxlength: [100, "City name too long"] },
// state: { type: String , trim: true , required: true, minlength: [2, "State name too short"], maxlength: [100, "State name too long"] },
// country: { type: String , trim: true , required: true, minlength: [2, "Country name too short"], maxlength: [100, "Country name too long"] },

// For contact visibility (plans)
// contactVisible: { type: Boolean, default: false },

    // Verification & Security
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },

    otp: { type: String },
    otpExpiry: { type: Date },

    // Account status & Role
    role: {
      type: String,
      enum: ["User", "Admin"],
      default: "User",
    },

    status: {
      type: String,
      enum: ["Active", "Pending", "Blocked", "Deactivate", "Deleted"],
      default: "Pending",
    },

    profileCompleted: {
      type: Number,
      default: 0, // later compute based on fields filled
    },
    // In your User model (userModel.js)
    pendingEmail: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          // validate only if a pending email exists
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
          if (!v) return true; // allow null
          return v > Date.now();
        },
        message: "OTP expiry must be a future date",
      },
    },

    deactivation: {
      isDeactivated: { type: Boolean, default: false },
      reason: { type: String },
      deactivateUntil: { type: Date }, // store reactivation date
    },

    deleteReason: {
      reason: { type: String },
      details: { type: String },
      deletedAt: { type: Date },
    },

   refreshToken: {
  type: String,
  default: null,
}

  },
  { timestamps: true }
);

// ✅ JWT Token
userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, role: this.role },
    //process.env.JWT_SECRET,
    "Smp346##",
    { expiresIn: "1d" }
  );
  return token;
};

// ✅ Hash password before save
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    // If password already appears to be a bcrypt hash, skip re-hashing.
    // This allows creating the final user from a pending user where we stored a hashed password.
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
