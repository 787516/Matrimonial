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

async function sendOtpEmail(email, otp = null, purpose = "registration") {
  try {
    let subject = "";
    let introMessage = "";
    let showOtpBlock = true;

    switch (purpose) {
      case "reset":
        subject = "Reset Your Password - Matrimony App 🔒";
        introMessage = "We received a request to reset your password. Please use the OTP below to continue.";
        break;

      case "resetEmail":
        subject = "Verify Your New Email - Matrimony App 📧";
        introMessage = "You requested to change your registered email. Use the OTP below to verify this new email.";
        break;

      case "alertOldEmail":
        subject = "⚠ Security Alert: Email Change Requested";
        introMessage = `
          Your account has requested to update the registered email address.<br/>
          If this was <strong>NOT</strong> you, please secure your account immediately.
        `;
        showOtpBlock = false; // ❌ No OTP here
        break;
        
      default:
        subject = "Your OTP Verification Code - Matrimony App 💍";
        introMessage = "Thank you for registering. Use the OTP below to verify your email.";
    }

    const mailOptions = {
      from: process.env.FROM_EMAIL || "Matrimony App <omkarpowar8724@gmail.com>",
      to: email,
      subject,
      html: `
      <div style="background:#f8f9fa;padding:40px 0;font-family:Arial">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:10px;overflow:hidden">
          
          <div style="background:#d92332;padding:20px;text-align:center;color:#fff;font-size:22px">
            Matrimony App
          </div>

          <div style="padding:30px;font-size:15px;color:#333">
            <p>Hi there,</p>
            <p>${introMessage}</p>

            ${
              showOtpBlock
                ? `
              <div style="text-align:center;margin:30px 0">
                <p style="font-size:18px;color:#555">Your OTP Code</p>
                <h2 style="font-size:36px;color:#d92332;letter-spacing:4px">${otp}</h2>
                <p style="font-size:13px;color:#777">Valid for 10 minutes</p>
              </div>`
                : ""
            }
            <p>If this action wasn't done by you, please change your password immediately.</p>

            <p style="margin-top:25px">Regards,<br/><b style="color:#d92332">Matrimony Team</b></p>
          </div>
          <div style="background:#eee;padding:12px;text-align:center;font-size:12px;color:#777">
            © ${new Date().getFullYear()} Matrimony App
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
