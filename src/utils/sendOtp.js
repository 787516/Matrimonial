import nodemailer from "nodemailer";

// ✅ Use .env variables instead of hardcoding credentials
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 465,
  secure: true, // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER || "omkarpowar8724@gmail.com",
    pass: process.env.EMAIL_PASS || "ivpoahyuxqzvhvsb",
  },
});

// ✅ Verify transporter connection once at startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter not ready:", error);
  } else {
    console.log("✅ Email transporter is ready to send messages");
  }
});

/**
 * Send OTP Email (for both Registration and Reset Password)
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @param {"registration" | "reset"} purpose - Type of OTP email
 */
async function sendOtpEmail(email, otp, purpose = "registration") {
  try {
    // ✅ Dynamic subject and message
    const subject =
      purpose === "reset"
        ? "Reset Your Password - Matrimony App 🔒"
        : "Your OTP Verification Code - Matrimony App 💍";

    const introMessage =
      purpose === "reset"
        ? "We received a request to reset your password."
        : "Thank you for registering on <strong>Matrimony Platform</strong>.";

    const mailOptions = {
      from: process.env.FROM_EMAIL || "Matrimony App <omkarpowar8724@gmail.com>",
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.6; padding:20px;">
          <h2 style="color:#d92332;">Matrimony App Notification</h2>
          <p>${introMessage}</p>
          <p>Your One-Time Password (OTP) is:</p>
          <h1 style="color:#d92332; letter-spacing:3px;">${otp}</h1>
          <p>This OTP is valid for <strong>10 minutes</strong>.</p>
          <p>If you did not initiate this, please ignore this email.</p>
          <br />
          <p>Regards,</p>
          <p><strong>Matrimony App Team</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP (${purpose}) sent successfully to ${email}`);
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    throw new Error("Failed to send OTP email");
  }
}

export default sendOtpEmail;
