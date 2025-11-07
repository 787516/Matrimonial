import mongoose from "mongoose";

const pendingUserSchema = new mongoose.Schema(
  {
    profileFor: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true }, // bcrypt hash of password
    gender: { type: String },
    dateOfBirth: { type: Date },
    maritalStatus: { type: String },
    otp: { type: String },
    otpExpiry: { type: Date },
  },
  { timestamps: true }
);

const PendingUser = mongoose.model("PendingUser", pendingUserSchema);
export default PendingUser;
