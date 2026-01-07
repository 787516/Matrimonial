// utils/sendOtpEmail.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || "omkarpowar8724@gmail.com",
    pass: process.env.EMAIL_PASS || "ivpoahyuxqzvhvsb",
  },
});

/**
 * Allowed purposes - only send emails for these.
 * Add entries here only when you intentionally want to send an email.
 */
const ALLOWED_PURPOSES = new Set([
  "registration",   // normal signup OTP
  "reset",          // reset password OTP
  "resetEmail",     // OTP to new email for email change
  "alertOldEmail",  // approval / cancel links to old email
]);

/**
 * Send OTP / security emails.
 *
 * - `email` (string) : recipient
 * - `otp` (string|null) : 6-digit OTP when relevant
 * - `purpose` (string) : one of allowed purposes
 * - `options` (object) : extra options (approveRaw, cancelRaw, uid, etc)
 */
async function sendOtpEmail(email, otp = null, purpose = "registration", options = {}) {
  try {
    // Basic validation
    if (!email) {
      console.error("sendOtpEmail called without email, skipping.");
      return;
    }

    // If caller used an unintended purpose, skip to avoid spam
    if (!ALLOWED_PURPOSES.has(purpose)) {
      console.log("🚫 Skipping email - purpose not allowed:", { purpose, email });
      return;
    }

    // OTP-required purposes must have an OTP
    const otpRequired = ["registration", "reset", "resetEmail"].includes(purpose);
    if (otpRequired && !otp) {
      console.log("🚫 Skipping OTP email because OTP is missing for purpose:", { purpose, email });
      return;
    }

    // Helpful debug log to trace who is calling sendOtpEmail
    console.log("📨 sendOtpEmail called:", { email, purpose, hasOtp: Boolean(otp), optionsProvided: Object.keys(options) });

    // Build subject/message
    let subject = "";
    let introMessage = "";
    // show OTP block only when otp is truthy
    let showOtpBlock = Boolean(otp);

    switch (purpose) {
      case "registration":
        subject = "Your OTP Verification Code - Matrimony App 💍";
        introMessage = "Thank you for registering. Use the OTP below to verify your email.";
        break;

      case "reset":
        subject = "Reset Your Password - Matrimony App 🔒";
        introMessage = "We received a request to reset your password. Please use the OTP below to continue.";
        break;

      case "resetEmail":
        subject = "Verify Your New Email - Matrimony App 📧";
        introMessage = "You requested to change your registered email. Use the OTP below to verify this new email.";
        break;

      case "alertOldEmail": {
        subject = "⚠ Security Alert: Email Change Requested";
        // alertOldEmail should NOT show OTP block
        showOtpBlock = false;

        const baseUrl = process.env.BACKEND_URL || "http://localhost:1818";

        // use provided raw tokens (if present) to build approve/cancel links
        const approveRaw = options.approveRaw || "";
        const cancelRaw = options.cancelRaw || "";
        const uidQuery = options.uid ? `&uid=${options.uid}` : "";

        const approveLink = `${baseUrl}/api/settings/confirm-email-change?token=${approveRaw}${uidQuery}`;
        const cancelLink = `${baseUrl}/api/settings/cancel-email-change?token=${cancelRaw}${uidQuery}`;

        introMessage = `
          Your account has requested to update the registered email address.<br/><br/>

          <strong>Please confirm if this was you:</strong>

          <div style="margin-top:20px;text-align:center">
            <a href="${approveLink}"
              style="display:inline-block;padding:12px 20px;border-radius:6px;
                     background:#28a745;color:#fff;text-decoration:none;
                     font-weight:bold;margin-right:10px;">
              ✅ Yes, it was me
            </a>

            <a href="${cancelLink}"
              style="display:inline-block;padding:12px 20px;border-radius:6px;
                     background:#dc3545;color:#fff;text-decoration:none;
                     font-weight:bold;">
              ❌ No, cancel request
            </a>
          </div>

          <p style="margin-top:20px">
            If this was not you, we strongly recommend changing your password immediately.
          </p>
        `;
        break;
      }

      default:
        // This should never run due to ALLOWED_PURPOSES guard, but keep fallback
        subject = "Your OTP Verification Code - SnehaBandh Matrimony 💍";
        introMessage = "Use the OTP below to verify your email.";
    }

    const mailOptions = {
      from: process.env.FROM_EMAIL || "Matrimony App <omkarpowar8724@gmail.com>",
      to: email,
      subject,
      html: `
      <div style="background:#f8f9fa;padding:40px 0;font-family:Arial,Helvetica,sans-serif">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:10px;overflow:hidden">
          
          <div style="background:#d92332;padding:20px;text-align:center;color:#fff;font-size:22px">
            SnehaBandh Matrimony
          </div>

          <div style="padding:30px;font-size:15px;color:#333">
            <p>Hi there,</p>
            <p style="margin-top:8px;line-height:1.6">${introMessage}</p>

            ${
              showOtpBlock
                ? `
              <div style="text-align:center;margin:30px 0">
                <p style="font-size:18px;color:#555;margin:0 0 8px 0">Your OTP Code</p>
                <h2 style="font-size:36px;color:#d92332;letter-spacing:4px;margin:0">${otp}</h2>
                <p style="font-size:13px;color:#777;margin-top:10px">Valid for 10 minutes</p>
              </div>`
                : ""
            }

            <p style="margin-top:18px;color:#444;line-height:1.5">
              If this action wasn't done by you, please change your password immediately.
            </p>

            <p style="margin-top:25px">Regards,<br/><b style="color:#d92332">Matrimony Team</b></p>
          </div>

          <div style="background:#eee;padding:12px;text-align:center;font-size:12px;color:#777">
            © ${new Date().getFullYear()} SnehaBandh Matrimony
          </div>

        </div>
      </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent (${purpose}) → ${email}`);
  } catch (error) {
    console.error("❌ Email send error:", error);
    throw new Error("Failed to send email");
  }
}

export default sendOtpEmail;
