import nodemailer from "nodemailer";

/**
 * Robust subscription email sender (copy-paste ready)
 *
 * Behavior:
 * - Expects caller to pass accurate values (amount, baseAmount, taxAmount).
 * - If baseAmount/taxAmount are missing, this will compute them as a safe fallback
 *   using GST_RATE and GST_ENABLED environment flags.
 * - If invoiceNumber/invoiceDate are missing, it will generate sensible defaults.
 * - Template shows correct wording depending on whether taxAmount > 0.
 *
 * Env (optional):
 * - EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, FROM_EMAIL
 * - GST_ENABLED ("true" / "false"), GST_RATE (e.g. "0.18")
 * - SELLER_NAME, SELLER_EMAIL, SELLER_GSTIN
 */

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT || 465),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || "omkarpowar8724@gmail.com",
    pass: process.env.EMAIL_PASS || "ivpoahyuxqzvhvsb",
  },
});

// Helpers
const fmt = (n) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const generateInvoiceNumber = () => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yyyy}${mm}${dd}-${rand}`;
};

const safeText = (v, fallback = "") => (v === undefined || v === null ? fallback : v);

const sendSubscriptionEmail = async ({
  email,
  name,
  planName,
  amount, // total paid (assumed inclusive if GST enabled)
  startDate,
  endDate,
  paymentId,

  invoiceNumber,
  invoiceDate,
  baseAmount,
  taxAmount,
  // optional overrides
  gstRate, // e.g. 0.18
  gstEnabled, // true/false
}) => {
  try {
    // Normalize basic values
    const total = Number(amount) || 0;
    const GST_ENABLED =
      gstEnabled !== undefined
        ? Boolean(gstEnabled)
        : String(process.env.GST_ENABLED || "true").toLowerCase() === "true";
    const GST_RATE =
      gstRate !== undefined
        ? Number(gstRate)
        : Number.parseFloat(process.env.GST_RATE || "0.18");

    // Compute fallback baseAmount/taxAmount only if not provided
    let base = baseAmount !== undefined && baseAmount !== null ? Number(baseAmount) : null;
    let tax = taxAmount !== undefined && taxAmount !== null ? Number(taxAmount) : null;

    if ((base === null || tax === null) && total > 0) {
      if (GST_ENABLED && GST_RATE > 0) {
        base = +(total / (1 + GST_RATE)).toFixed(2);
        tax = +(total - base).toFixed(2);
      } else {
        base = total;
        tax = 0;
      }
    }

    // Ensure we have numeric safe values
    base = Number.isFinite(base) ? base : 0;
    tax = Number.isFinite(tax) ? tax : 0;

    // Invoice metadata defaults
    const invNo = safeText(invoiceNumber, generateInvoiceNumber());
    const invDate = invoiceDate ? new Date(invoiceDate) : new Date();
    const invDateStr = invDate.toDateString();

    // Seller info from env (optional)
    const SELLER_NAME = process.env.SELLER_NAME || "Matrimony App";
    const SELLER_EMAIL = process.env.SELLER_EMAIL || "support@matrimonyapp.com";
    const SELLER_GSTIN = process.env.SELLER_GSTIN || ""; // leave blank if not set

    // Build HTML (concise & safe)
    const html = `
      <div style="background:#f8f9fa;padding:40px 0;font-family:Arial,Helvetica,sans-serif;color:#222">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e6e6e6">
          
          <div style="background:#d92332;color:#fff;padding:20px;text-align:center;font-size:22px">
            ${SELLER_NAME}
          </div>

          <div style="padding:30px;color:#333;font-size:15px;line-height:1.5">
            <p>Hi <b>${safeText(name, "User")}</b>,</p>

            <p>Thank you for subscribing! Your membership has been successfully activated.</p>

            <div style="border:1px solid #eee;border-radius:8px;padding:20px;margin:20px 0;background:#fafafa">
              <h3 style="margin:0 0 8px 0;color:#d92332">Invoice Summary</h3>

              <p style="margin:6px 0"><b>Invoice No:</b> ${invNo}</p>
              <p style="margin:6px 0"><b>Invoice Date:</b> ${invDateStr}</p>

              <hr style="border:none;border-top:1px solid #eee;margin:10px 0"/>

              <p style="margin:6px 0"><b>Plan:</b> ${safeText(planName, "-")}</p>
              <p style="margin:6px 0"><b>Base Amount:</b> ₹${fmt(base)}</p>
              <p style="margin:6px 0"><b>GST ${GST_ENABLED ? `(${(GST_RATE * 100).toFixed(0)}%)` : ""}:</b> ₹${fmt(tax)}</p>

              <p style="margin:12px 0;font-weight:700">Total Paid (Inclusive of GST): ₹${fmt(total)}</p>

              <p style="font-size:12px;color:#777;margin-top:10px">
                ${
                  tax > 0
                    ? `GST charged at ${(GST_RATE * 100).toFixed(0)}% and included in the total amount.`
                    : "GST not applicable as the service provider is not registered under GST."
                }
              </p>

              <hr style="border:none;border-top:1px solid #eee;margin:10px 0"/>

              <p style="margin:6px 0"><b>Subscription Period:</b></p>
              <p style="margin:6px 0">${safeText(startDate, "-")} → ${safeText(endDate, "-")}</p>

              <p style="margin:6px 0"><b>Payment ID:</b> ${safeText(paymentId, "-")}</p>
            </div>

            <div style="font-size:13px;color:#555;margin-top:10px">
              <b>Seller:</b> ${SELLER_NAME}<br/>
              Email: ${SELLER_EMAIL}<br/>
              ${SELLER_GSTIN ? `GSTIN: ${SELLER_GSTIN}` : ""}
            </div>

            <p style="font-size:12px;color:#777;margin-top:16px">
              This is a system-generated invoice. No signature required.
            </p>

            <p style="margin-top:18px">
              You can now enjoy all premium features of your plan.
            </p>

            <p style="margin-top:22px">
              Regards,<br/>
              <b style="color:#d92332">${SELLER_NAME} Team</b>
            </p>
          </div>

          <div style="background:#f1f1f1;padding:12px;text-align:center;font-size:12px;color:#777">
            © ${new Date().getFullYear()} ${SELLER_NAME}
          </div>

        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.FROM_EMAIL || `${SELLER_NAME} <${process.env.EMAIL_USER || SELLER_EMAIL}>`,
      to: email,
      subject: "🎉 Subscription Activated - " + SELLER_NAME,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log("📧 Subscription email sent to", email, "invoice:", invNo);
  } catch (error) {
    console.error("❌ Subscription email error:", error);
    throw error; // rethrow if caller wants to handle failures
  }
};

export default sendSubscriptionEmail;
