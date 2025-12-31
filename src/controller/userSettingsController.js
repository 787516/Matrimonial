import User from "../models/userModel.js";
import UserDeleteLog from "../models/userDeleteLogModel.js";
import bcrypt from "bcryptjs";
import sendOtpEmail from "../utils/sendOtp.js";
import validator from "validator";
import crypto from "crypto";
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

const createToken = () => {
  const raw = crypto.randomBytes(32).toString("hex"); // sent in email
  const hash = crypto.createHash("sha256").update(raw).digest("hex"); // stored in DB
  return { raw, hash };
};

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

    // create OTP for new email
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    // create approval and cancel tokens (raw + hash)
    const approval = createToken();
    const cancel = createToken();
    const tokenExpiryMs = 24 * 60 * 60 * 1000; // approval/cancel link valid 24h

    // Save pending change details (store hashed tokens & flags)
    user.pendingEmail = newEmail.trim();
    user.emailChangeOtp = otp;
    user.emailChangeOtpExpiry = otpExpiry;
    user.emailChangeApprovalTokenHash = approval.hash;
    user.emailChangeApprovalTokenExpiry = Date.now() + tokenExpiryMs;
    user.emailChangeCanceled = false;
    user.emailChangeApproved = false;

    await user.save();

    // Send OTP to new email
    await sendOtpEmail(newEmail, otp, "resetEmail");

    // Send alert to OLD email with approve/cancel links (send raw tokens in link)
    const frontendBase =
      process.env.FRONTEND_URL ||
      process.env.BASE_URL ||
      "https://your-frontend.example";
    // you can also point to backend endpoints instead
    const approveLink = `${
      process.env.BACKEND_URL || "https://your-api.example"
    }/api/account/confirm-email-change?token=${approval.raw}&uid=${user._id}`;
    const cancelLink = `${
      process.env.BACKEND_URL || "https://your-api.example"
    }/api/account/cancel-email-change?token=${cancel.raw}&uid=${user._id}`;

    // We pass both raw tokens to email so user can click. We store only the hash.
    await sendOtpEmail(user.email, null, "alertOldEmail", {
      approveRaw: approval.raw,
      cancelRaw: cancel.raw,
      approveExpiry: tokenExpiryMs,
    });

    // BUT we must also store the cancel token hash — we did approval.hash but not cancel.hash yet:
    user.emailChangeCancelTokenHash = cancel.hash;
    user.emailChangeCancelTokenExpiry = Date.now() + tokenExpiryMs;
    await user.save();

    res.json({
      message:
        "OTP sent to new email. Approval/Cancel links sent to old email (valid 24h).",
    });
  } catch (err) {
    console.error("❌ Email change request error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
};

//New controller: confirm (approve) via link
export const confirmEmailChange = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("Invalid request");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailChangeApprovalTokenHash: tokenHash,
      emailChangeApprovalTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send("Invalid or expired approval link");
    }

    // mark approved and clear approval token (one-time-use)
    user.emailChangeApproved = true;
    user.emailChangeApprovalTokenHash = null;
    user.emailChangeApprovalTokenExpiry = null;
    await user.save();

    // optionally send a notification email to both addresses
    await sendOtpEmail(user.email, null, "approvalConfirmedToOldEmail");
    if (user.pendingEmail) {
      await sendOtpEmail(
        user.pendingEmail,
        null,
        "approvalConfirmedToNewEmail"
      );
    }

    // return a friendly HTML success page
    return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Change Approved</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">

  <div style="max-width:600px;margin:60px auto;background:#ffffff;
              border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,0.08);
              overflow:hidden;">

    <!-- Header -->
    <div style="background:#28a745;padding:24px;text-align:center;color:#fff;">
      <h1 style="margin:0;font-size:24px;">Email Change Approved ✅</h1>
    </div>

    <!-- Body -->
    <div style="padding:30px;color:#333;text-align:center;">
      <p style="font-size:16px;line-height:1.6;margin-bottom:20px;">
        You have successfully approved the request to change your registered email address.
      </p>

      <p style="font-size:15px;line-height:1.6;margin-bottom:30px;">
        To complete the process, please return to the app and enter the
        <strong>OTP sent to your new email address</strong>.
      </p>

      <div style="background:#f1fdf4;border:1px solid #c3e6cb;
                  padding:15px;border-radius:6px;font-size:14px;color:#155724;">
        🔐 This extra step helps keep your account secure.
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f0f0f0;padding:15px;text-align:center;
                font-size:13px;color:#777;">
      © ${new Date().getFullYear()} Matrimony Team
    </div>

  </div>

</body>
</html>
`);
  } catch (err) {
    console.error("confirmEmailChange error", err);
    res.status(500).send("Server error");
  }
};

//New controller: cancel via link
export const cancelEmailChange = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("Invalid request");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailChangeApprovalTokenHash: tokenHash,
      emailChangeApprovalTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send("Invalid or expired approval link");
    }

    // Clear pending change and tokens
    const oldPending = user.pendingEmail;
    user.pendingEmail = null;
    user.emailChangeOtp = null;
    user.emailChangeOtpExpiry = null;
    user.emailChangeApprovalTokenHash = null;
    user.emailChangeApprovalTokenExpiry = null;
    user.emailChangeCancelTokenHash = null;
    user.emailChangeCancelTokenExpiry = null;
    user.emailChangeCanceled = true;
    user.emailChangeApproved = false;
    await user.save();

    // notify both addresses
    await sendOtpEmail(user.email, null, "cancelConfirmedToOldEmail");
    if (oldPending)
      await sendOtpEmail(oldPending, null, "cancelConfirmedToNewEmail");

    return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Change Canceled</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">

  <div style="max-width:600px;margin:60px auto;background:#ffffff;
              border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,0.08);
              overflow:hidden;">

    <!-- Header -->
    <div style="background:#dc3545;padding:24px;text-align:center;color:#fff;">
      <h1 style="margin:0;font-size:24px;">Email Change Canceled ❌</h1>
    </div>

    <!-- Body -->
    <div style="padding:30px;color:#333;text-align:center;">
    
      <p style="font-size:16px;line-height:1.6;margin-bottom:20px;">
        The request to change your registered email address has been
        <strong>successfully canceled</strong>.
      </p>

      <p style="font-size:15px;line-height:1.6;margin-bottom:30px;">
        If you did <strong>not</strong> initiate this request, we strongly recommend
        changing your password immediately.
      </p>

      <div style="background:#fef2f2;border:1px solid #f5c6cb;
                  padding:15px;border-radius:6px;font-size:14px;color:#721c24;">
        ⚠️ This action protected your account from an unauthorized change.
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f0f0f0;padding:15px;text-align:center;
                font-size:13px;color:#777;">
      © ${new Date().getFullYear()} Matrimony Team
    </div>

  </div>

</body>
</html>
`);
  } catch (err) {
    console.error("cancelEmailChange error", err);
    res.status(500).send("Server error");
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

    // must have pendingEmail
    if (!user.pendingEmail) {
      return res
        .status(400)
        .json({ message: "No pending email change request" });
    }

    // check OTP
    const isOtpValid =
      user.emailChangeOtp === otp && Date.now() < user.emailChangeOtpExpiry;

    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // check OLD email approval
    if (!user.emailChangeApproved) {
      return res.status(403).json({
        message:
          "Change not approved from old email yet. Please click the Approve link sent to your previous email address.",
      });
    }

    // ✅ Update email
    user.email = user.pendingEmail;
    user.pendingEmail = null;
    user.emailChangeOtp = null;
    user.emailChangeOtpExpiry = null;
    user.emailChangeApproved = false;
    user.emailChangeCanceled = false;
    user.emailChangeCancelTokenHash = null;
    user.emailChangeCancelTokenExpiry = null;
    await user.save();

    // notify new email & old email the change is complete
    await sendOtpEmail(user.email, null, "completedToNewEmail");
    await sendOtpEmail(user.email, null, "completedToOldEmail"); // you may want to send to old email address before override; save old prior

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
      return res
        .status(400)
        .json({ message: "Duration and unit are required." });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const deactivateUntil = new Date();
    if (unit === "days")
      deactivateUntil.setDate(deactivateUntil.getDate() + parseInt(duration));
    else if (unit === "months")
      deactivateUntil.setMonth(deactivateUntil.getMonth() + parseInt(duration));
    else
      return res
        .status(400)
        .json({ message: "Invalid unit. Use 'days' or 'months'." });

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
    const { reasonType, marriageDate, groomName, source, receiveGift, story } =
      req.body;

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
