import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || "omkarpowar8724@gmail.com",
    pass: process.env.EMAIL_PASS || "ivpoahyuxqzvhvsb",
  },
});

/**
 * Send OTP Email (Registration / Password Reset / Email Change)
 */

async function sendOtpEmail(email, otp, purpose = "registration") {
  try {
    let subject = "";
    let introMessage = "";

    // 🎯 Define custom messages for each purpose
    switch (purpose) {
      case "reset":
        subject = "Reset Your Password - Matrimony App 🔒";
        introMessage =
          "We received a request to reset your password. Please use the OTP below to complete the process.";
        break;

      case "resetEmail":
        subject = "Confirm Your New Email Address - Matrimony App 📧";
        introMessage =
          "You requested to change your registered email address. Please verify this new email using the OTP below to complete the update.";
        break;

      default:
        subject = "Your OTP Verification Code - Matrimony App 💍";
        introMessage =
          "Thank you for registering with <strong>Matrimony Platform</strong>. Please verify your email using the OTP below.";
    }

    const mailOptions = {
      from:
        process.env.FROM_EMAIL || "Matrimony App <omkarpowar8724@gmail.com>",
      to: email,
      subject,
      html: `
      <div style="background-color:#f8f9fa; padding:40px 0; font-family: 'Segoe UI', Arial, sans-serif;">
        <div style="max-width:600px; background-color:#ffffff; margin:0 auto; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.1); overflow:hidden;">
          
          <!-- Header -->
          <div style="background-color:#d92332; padding:20px 0; text-align:center;">
            <h1 style="color:#ffffff; margin:0; font-size:24px;">Matrimony App</h1>
          </div>
          
          <!-- Body -->
          <div style="padding:30px; color:#333333;">
            <p style="font-size:16px; margin-bottom:15px;">Hi there,</p>
            <p style="font-size:16px; line-height:1.6;">${introMessage}</p>

            <div style="text-align:center; margin:30px 0;">
              <p style="font-size:18px; color:#555;">Your One-Time Password (OTP)</p>
              <h2 style="font-size:36px; color:#d92332; letter-spacing:4px; margin:10px 0;">${otp}</h2>
              <p style="font-size:14px; color:#777;">Valid for <strong>10 minutes</strong>.</p>
            </div>

            <p style="font-size:15px; line-height:1.6;">If you did not request this, please ignore this email. Your account remains secure.</p>

            <p style="margin-top:30px;">Best regards,<br/>
            <strong style="color:#d92332;">Matrimony App Team</strong></p>
          </div>

          <!-- Footer -->
          <div style="background-color:#f1f1f1; text-align:center; padding:15px 0;">
            <p style="font-size:12px; color:#888; margin:0;">
              &copy; ${new Date().getFullYear()} Matrimony App. All rights reserved.<br/>
              <a href="#" style="color:#d92332; text-decoration:none;">Visit our website</a>
            </p>
          </div>

        </div>
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
