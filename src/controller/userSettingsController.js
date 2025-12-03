import User from "../models/userModel.js";
import UserDeleteLog from "../models/userDeleteLogModel.js";
import bcrypt from "bcryptjs";
import sendOtpEmail from "../utils/sendOtp.js";
import validator from "validator";

/**
 * ✅ Request Email Change (Send OTP to new email)
 */

// export const requestEmailChange = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { newEmail } = req.body;

//     if (!newEmail || !validator.isEmail(newEmail.trim())) {
//       return res.status(400).json({ message: "Invalid email format" });
//     }

//     const emailExists = await User.findOne({ email: newEmail.trim().toLowerCase() });
//     if (emailExists) {
//       return res.status(400).json({ message: "Email is already in use" });
//     }

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const otp = String(Math.floor(100000 + Math.random() * 900000));

//     user.pendingEmail = newEmail.trim().toLowerCase();
//     user.emailChangeOtp = otp;
//     user.emailChangeOtpExpiry = Date.now() + 10 * 60 * 1000; // valid 10 mins
//     await user.save();

//     await sendOtpEmail(newEmail, otp, "resetEmail"); // send OTP to new email

//     res.json({ message: `OTP sent to ${newEmail} for verification.` });
//   } catch (err) {
//     console.error("❌ Email change error:", err);
//     res.status(500).json({ error: "Something went wrong while sending email change OTP." });
//   }
// };

export const requestEmailChange = async (req, res) => {
  try {
    const userId = req.user._id;
    const { newEmail } = req.body;

    if (!newEmail || !validator.isEmail(newEmail.trim())) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const emailInUse = await User.findOne({ email: newEmail.trim() });
    if (emailInUse) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Save pending change details
    user.pendingEmail = newEmail.trim();
    user.emailChangeOtp = otp;
    user.emailChangeOtpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send OTP to new email
    await sendOtpEmail(newEmail, otp, "resetEmail");

    // Send alert to OLD email
    await sendOtpEmail(user.email, null, "alertOldEmail");

    res.json({
      message: "OTP sent to new email. Security alert sent to old email.",
    });

  } catch (err) {
    console.error("❌ Email change request error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
};


/**
 * ✅ Verify Email Change (Verify OTP and update email)
 */

export const verifyEmailChange = async (req, res) => {
  try {
    const userId = req.user._id;
    const { otp } = req.body;

    if (!otp) return res.status(400).json({ message: "OTP is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isOtpValid =
      user.emailChangeOtp === otp && Date.now() < user.emailChangeOtpExpiry;

    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // ✅ Update email
    user.email = user.pendingEmail;
    user.pendingEmail = null;
    user.emailChangeOtp = null;
    user.emailChangeOtpExpiry = null;
    await user.save();

    res.json({ message: "Email updated and verified successfully." });
  } catch (err) {
    console.error("❌ Verify email error:", err);
    res.status(500).json({ error: "Failed to verify email OTP." });
  }
};

/**
 * ✅ Update Password (after verifying old password)
 */
export const updatePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { newPassword } = req.body;

    // Validate new password
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required." });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters long" });
    }

    // Find user
    const user = await User.findById(userId).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Hash and save
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("❌ Update password error:", err);
    res.status(500).json({ error: "Failed to update password." });
  }
};

/**
 * ✅ Deactivate Profile Temporarily
 */
export const deactivateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { duration, unit, reason } = req.body;

    if (!duration || !unit) {
      return res.status(400).json({ message: "Duration and unit are required." });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const deactivateUntil = new Date();
    if (unit === "days") deactivateUntil.setDate(deactivateUntil.getDate() + parseInt(duration));
    else if (unit === "months") deactivateUntil.setMonth(deactivateUntil.getMonth() + parseInt(duration));
    else return res.status(400).json({ message: "Invalid unit. Use 'days' or 'months'." });

    user.deactivation = {
      isDeactivated: true,
      reason: reason || "User requested deactivation",
      deactivateUntil,
    };

    user.status = "Deactivate";
    await user.save();

    res.json({
      message: `Profile deactivated until ${deactivateUntil.toDateString()}`,
    });
    
  } catch (err) {
    console.error("❌ Deactivation error:", err);
    res.status(500).json({ error: "Failed to deactivate profile." });
  }
};

/**
 * ✅ Delete Profile Permanently
 */
export const deleteProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { reasonType, marriageDate, groomName, source, receiveGift, story } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Log delete reason
    await UserDeleteLog.create({
      userId,
      reasonType,
      marriageDate,
      groomName,
      source,
      receiveGift,
      story,
    });

    // Permanently delete user
    await User.findByIdAndDelete(userId);

    res.json({ message: "Account deleted successfully." });
  } catch (err) {
    console.error("❌ Delete profile error:", err);
    res.status(500).json({ error: "Failed to delete account." });
  }
};
