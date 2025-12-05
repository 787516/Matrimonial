import User from "../models/userModel.js";
import UserProfileDetail from "../models/userProfileDetailModel.js";
import UserPartnerPreference from "../models/userPartnerPreferenceModel.js";
import UserPhotoGallery from "../models/userPhotoGalleryModel.js";
import userSubscription from "../models/userSubscriptionModel.js";
import PendingUser from "../models/pendingUserModel.js";
import validator from "validator";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import sendOtpEmail from "../utils/sendOtp.js";


// REGISTER USER → create pending entry and send OTP
export const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      middleName,
      email,
      phone,
     // password,
      profileFor,
      gender,
      dateOfBirth,
      maritalStatus,
      city,
      state,
      country,
      district,
      area,
      pincode,
    } = req.body;

    // Basic validations
    if (!email) return res.status(400).json({ message: "Email is required" });
   // if (!email || !password) return res.status(400).json({ message: "Email and password required" });
    if (!validator.isEmail(email)) return res.status(400).json({ message: "Invalid email" });
    if (phone && !validator.isMobilePhone(phone, "any")) return res.status(400).json({ message: "Invalid phone" });
    // If permanent user already exists, refuse
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    // Generate OTP & expiry
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Hash the password before storing in pending
    // const passwordHash = await bcrypt.hash(password, 10);

    const pendingPayload = {
      profileFor,
      firstName,
      middleName,
      lastName,
      email,
      phone,
   // passwordHash,
      gender,
      dateOfBirth,
      maritalStatus,
      city,
      state,
      country,
      district,
      area,
      pincode,
      otp,
      otpExpiry,
    };

    await PendingUser.findOneAndUpdate({ email }, pendingPayload, { upsert: true, new: true, setDefaultsOnInsert: true });

     sendOtpEmail(email, otp)

    return res.status(200).json({ message: "OTP sent to email. Verify to complete registration." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 🔥 Helper: fetch full merged data for user
const getFullUserBundle = async (userId) => {
  const user = await User.findById(userId).select("-password -otp -otpExpiry");

  const profile = await UserProfileDetail.findOne({ userId });

  const preferences = profile
    ? await UserPartnerPreference.findOne({ userProfileId: profile._id })
    : null;

  // const gallery = profile
  //   ? await UserPhotoGallery.find({ userProfileId: profile._id })
  //   : [];
  const gallery = await UserPhotoGallery.find({ userProfileId: userId });

  // const subscription = await SubscriptionModel.findOne({
  //   userId,
  //   isActive: true,
  // }).select("-__v");

  //return { user, profile, preferences, gallery, subscription };
  return { user, profile, preferences, gallery };

};


// LOGIN
// export const loginUser = async (req, res) => {
//   try { 
//     const { email, password } = req.body;

//     const user = await User.findOne({ email }).select("+password");
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const isMatch = await user.validatePassword(password);
//     if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

//     if (user.status !== "Active") return res.status(403).json({ message: "Account not active" });

//     const accessToken = generateAccessToken(user._id, user.role);
//     const refreshToken = generateRefreshToken(user._id);
//       // ✅ Save refresh token in DB 
//     user.refreshTokens.push(refreshToken);
//     await user.save();

//     res.json({ message: "Login success", accessToken, refreshToken });
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// };

// SEND OTP (resend during registration)
export const sendOtp = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    // ❌ If user is already registered, do NOT resend OTP
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email already registered" });
    }

    // ✔ Check pending user
    const pending = await PendingUser.findOne({ email });
    if (!pending) {
      return res.status(404).json({
        message: "No pending registration found. Please register first.",
      });
    }

    // ✔ Generate new OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    pending.otp = otp;
    pending.otpExpiry = Date.now() + 10 * 60 * 1000;
    await pending.save();

    // ✔ Send email
    await sendOtpEmail(email, otp);

    res.json({ message: "OTP resent to email" });
  } catch (e) {
    console.error("Send OTP error:", e);
    res.status(500).json({ error: e.message });
  }
};

// 🔥 FINAL LOGIN CONTROLLER (Merged Unified Schema)
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔹 Step 1: Find user
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }
    // 🔹 Step 2: Validate password
    const isMatch = await user.validatePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 🔹 Step 3: Check account status
    if (user.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Account not active",
      });
    }

    // 🔹 Step 4: Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;   // store only one
    await user.save();

    // 🔹 Step 5: Fetch merged user data
    const bundle = await getFullUserBundle(user._id);

    // 🔹 Step 6: Return unified response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        auth: {
          accessToken,
          refreshToken,
          tokenExp: jwt.decode(accessToken)?.exp * 1000,
        },
        ...bundle,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Something went wrong during login",
    });
  }
};

// VERIFY OTP -> create permanent user and forgot password
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp, purpose } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    // If purpose = registration  → check PendingUser
    if (purpose === "register") {
      const pending = await PendingUser.findOne({ email });
      if (!pending)
        return res.status(404).json({ message: "No pending registration found" });

      if (!pending.otp || pending.otp !== otp || Date.now() > pending.otpExpiry) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // create user logic
      let registrationId;
      while (true) {
        const tempId = generateRegistrationId();
        const exists = await User.findOne({ registrationId: tempId });
        if (!exists) {
          registrationId = tempId;
          break;
        }
      }

      const userPayload = {
        profileFor: pending.profileFor,
        firstName: pending.firstName,
        middleName: pending.middleName,
        lastName: pending.lastName,
        email: pending.email,
        phone: pending.phone,
       // password: pending.passwordHash,
       password:null,
        gender: pending.gender,
        dateOfBirth: pending.dateOfBirth,
        maritalStatus: pending.maritalStatus,
        city: pending.city,
        state: pending.state,
        country: pending.country,
        district: pending.district,
        area: pending.area,
        pincode: pending.pincode,
        emailVerified: true,
        registrationId,
        status: "PendingPassword",
      };

      const newUser = await User.create(userPayload);
      await PendingUser.deleteOne({ _id: pending._id });

       // ==================================================
      // ⭐ AUTO-CREATE USER PROFILE DETAIL —
      //    FIXES "Profile not found" on all pages
      // ==================================================
      let profile = await UserProfileDetail.findOne({ userId: newUser._id });
      if (!profile) {
        profile = await UserProfileDetail.create({
          userId: newUser._id,
          gender: newUser.gender,
          dateOfBirth: newUser.dateOfBirth,
          city: newUser.city,
          state: newUser.state,
          country: newUser.country,
          maritalStatus: newUser.maritalStatus,
          profileFor: newUser.profileFor,
          profileCreatedBy: "Self",
          // default empty fields are allowed
        });
      }

      return res.json({
        message: "Email verified and account created",
        userId: newUser._id,
        registrationId: newUser.registrationId,
      });
    }

    // If purpose = forgot → check User collection
    if (purpose === "forgot") {
      const user = await User.findOne({ email }).select("+otp +otpExpiry");

      if (!user)
        return res.status(404).json({ message: "User not found" });

      if (!user.otp || user.otp !== otp || Date.now() > user.otpExpiry) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      return res.json({ message: "OTP verified", ok: true });
    }

    return res.status(400).json({ message: "Invalid purpose" });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
    console.log("OTP verification error:", e);
  }
};

// Forgot PASSWORD 
export const forgotPassword = async (req, res) => {
  console.log("🔑 Forgot password request received");
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Save OTP and expiry (10 mins)
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send OTP via email
    await sendOtpEmail(email, otp, "reset");

    res.json({ message: "OTP sent to your email address" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Something went wrong, please try again" });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // ✅ Verify OTP validity
    // if (user.otp !== otp) {
    //   return res.status(400).json({ message: "Invalid OTP" });
    // }

    if (Date.now() > user.otpExpiry) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // ✅ Hash new password before saving
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
// LOGOUT

export const logoutUser = async (req, res) => {
  console.log("🔒 Logout request received");
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "No refresh token provided" });
    }

    // Verify token signature
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if refreshToken matches DB
    if (user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Remove refresh token from user record
    user.refreshToken = null;
    await user.save();

    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(401).json({
      message: "Invalid or expired refresh token",
      error: error.message,
    });
  }
};


export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // 🧩 1️⃣ Check if token is provided
    if (!refreshToken)
      return res.status(400).json({ message: "Refresh token missing" });

    // 🧩 2️⃣ Verify refresh token signature
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // 🧩 3️⃣ Find user in DB
    const user = await User.findById(decoded._id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // 🧩 4️⃣ Check if this refresh token still exists in DB
    if (!user.refreshTokens.includes(refreshToken)) {
      return res
        .status(403)
        .json({ message: "Invalid or revoked refresh token" });
    }

    // 🧩 5️⃣ Generate a new access token
    const accessToken = generateAccessToken(user._id, user.role);

    res.json({
      message: "Access token refreshed successfully",
      accessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};


export const setPassword = async (req, res) => {
  console.log("api heet")
  try {
    const { email, password } = req.body;

    if (!password)
      return res.status(400).json({ message: "Password required" });

    const user = await User.findOne({ email }).select("+password");

    if (!user) return res.status(404).json({ message: "User not found" });

    // Hash new password
    const hash = await bcrypt.hash(password, 10);

    user.password = hash;
    user.status = "Active"; // CHANGED ↓
    await user.save();

    return res.json({ message: "Password set successfully. You can now login." });

  } catch (err) {
    console.log("setError", err)
    return res.status(500).json({ error: err.message });
    
  }
};




// ID Generator Helper
// ------------------
function generateRegistrationId() {
  const prefix = "RTS";
  const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 digits
  return `${prefix}${randomNum}`;
}