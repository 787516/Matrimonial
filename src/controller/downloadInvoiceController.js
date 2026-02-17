import UserSubscription from "../models/userSubscriptionModel.js";
import generateInvoicePDF from "../utils/generateInvoicePDF.js";

// Helper
const generateInvoiceNumber = () => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yyyy}${mm}${dd}-${rand}`;
};

export const downloadInvoice = async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({
      userId: req.user._id,
      status: "Active",
    }).populate("planId")
      .populate("userId");

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // 🔥 GST calculation (INSIDE controller)
    const GST_RATE = 0.18;
    const totalAmount = subscription.planId.price; // ₹8000

    const baseAmount = +(totalAmount / (1 + GST_RATE)).toFixed(2);
    const taxAmount = +(totalAmount - baseAmount).toFixed(2);

    // 🔥 Generate invoice lazily if missing
    let { invoiceNumber, invoiceDate } = subscription;

    if (!invoiceNumber) {
      invoiceNumber = generateInvoiceNumber();
      invoiceDate = new Date();

      subscription.invoiceNumber = invoiceNumber;
      subscription.invoiceDate = invoiceDate;
      subscription.baseAmount = baseAmount;
      subscription.taxAmount = taxAmount;
      subscription.taxPercent = 18;

      await subscription.save();
    }

    // 📄 Generate PDF
    generateInvoicePDF(
      {
        invoiceNumber,
        invoiceDate: invoiceDate.toDateString(),
        paymentId: subscription.paymentId,
        name: subscription.userId.firstName || "User",
        middleName: subscription.userId.middleName || "_",
        lastName: subscription.userId.lastName || "-",
        email: subscription.userId.email || "-",
        planName: subscription.planId.name,
        startDate: subscription.startDate.toDateString(),
        endDate: subscription.endDate.toDateString(),
        baseAmount: subscription.baseAmount,
        taxAmount: subscription.taxAmount,
        amount: totalAmount,
      },
      res
    );
  } catch (error) {
    console.error("Invoice download error:", error);
    res.status(500).json({ message: error.message });
  }
};
