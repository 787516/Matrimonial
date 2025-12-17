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

const sendSubscriptionEmail = async ({
  email,
  name,
  planName,
  amount,
  startDate,
  endDate,
  paymentId,
}) => {
  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL || "Matrimony App <omkarpowar8724@gmail.com>",
      to: email,
      subject: "🎉 Subscription Activated - Matrimony App",
      html: `
      <div style="background:#f8f9fa;padding:40px 0;font-family:Arial">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:10px;overflow:hidden">
          
          <div style="background:#d92332;color:#fff;padding:20px;text-align:center;font-size:22px">
            Matrimony App
          </div>

          <div style="padding:30px;color:#333;font-size:15px">
            <p>Hi <b>${name}</b>,</p>

            <p>Thank you for subscribing! Your membership has been successfully activated.</p>

            <div style="border:1px solid #eee;border-radius:8px;padding:20px;margin:20px 0">
              <h3 style="margin-top:0;color:#d92332">Subscription Details</h3>
              <p><b>Plan:</b> ${planName}</p>
              <p><b>Amount Paid:</b> ₹${amount}</p>
              <p><b>Start Date:</b> ${startDate}</p>
              <p><b>End Date:</b> ${endDate}</p>
              <p><b>Payment ID:</b> ${paymentId}</p>
            </div>

            <p>You can now enjoy all premium features of your plan.</p>

            <p style="margin-top:25px">
              Regards,<br/>
              <b style="color:#d92332">Matrimony Team</b>
            </p>
          </div>

          <div style="background:#eee;padding:12px;text-align:center;font-size:12px;color:#777">
            © ${new Date().getFullYear()} Matrimony App
          </div>

        </div>
      </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("📧 Subscription email sent to", email);
  } catch (error) {
    console.error("❌ Subscription email error:", error);
  }
};

export default sendSubscriptionEmail;
