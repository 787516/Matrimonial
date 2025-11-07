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
      enum: ["Active", "Pending", "Blocked", "Deleted"],
      default: "Pending",
    },

    profileCompleted: {
      type: Number,
      default: 0, // later compute based on fields filled
    },
    refreshTokens: {
      type: [String],
      default: [],
    },
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
