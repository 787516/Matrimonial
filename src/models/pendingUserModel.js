import mongoose from "mongoose";

const pendingUserSchema = new mongoose.Schema(
  {
    profileFor: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, required: true, trim: true },
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

const PendingUser = mongoose.model("PendingUser", pendingUserSchema);
export default PendingUser;
