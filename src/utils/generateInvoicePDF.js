import PDFDocument from "pdfkit";

const generateInvoicePDF = (data, res) => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // Headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${data.invoiceNumber}.pdf`
  );
  doc.pipe(res);

  /* =========================
     HEADER
  ========================== */
  doc
    .fontSize(22)
    .fillColor("#d92332")
    .text("SnehaBandh", { align: "center" });

  doc
    .moveDown(0.5)
    .fontSize(14)
    .fillColor("#000")
    .text("TAX INVOICE", { align: "center" });

  doc.moveDown(2);

  /* =========================
     INVOICE META (2 COLUMNS)
  ========================== */
  const leftX = 50;
  const rightX = 330;
  const startY = doc.y;
  doc.fontSize(10).fillColor("#000");
  // Left Column
  doc.text(`Invoice No: ${data.invoiceNumber}`, leftX, startY);
  doc.text(`Invoice Date: ${data.invoiceDate}`, leftX, startY + 15);
  doc.text(`Payment ID: ${data.paymentId}`, leftX, startY + 30);
  // Right column
  // doc.text(`Billed To: ${data.name}`, rightX, startY);
  // doc.text(`Email: ${data.email || "-"}`, rightX, startY + 15);
  const formattedName = data.name
  ? data.name.charAt(0).toUpperCase() + data.name.slice(1)
  : "User";

doc.text(`Billed To: ${formattedName}`, rightX, startY);

  // doc.text(`Billed To: ${data.name}`, rightX, startY);
doc.text(`Email: ${data.email || "-"}`, rightX, startY + 15);

  doc.moveDown(4);
  console.log("email pdf",data.email);
  // Divider
  doc
    .moveTo(50, doc.y)
    .lineTo(550, doc.y)
    .strokeColor("#dddddd")
    .stroke();

  doc.moveDown(1.5);

  /* =========================
     SUBSCRIPTION DETAILS
  ========================== */
  doc.fontSize(12).text("Subscription Details", { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(11);
  doc.text(`Plan: ${data.planName}`);
  doc.text(`Subscription Period: ${data.startDate} → ${data.endDate}`);
  doc.moveDown(2);
 
  /* =========================
     AMOUNT SUMMARY (BOX)
  ========================== */
/* =========================
   AMOUNT SUMMARY (BOX)
========================== */

const boxTop = doc.y;
const boxHeight = 90;

doc
  .rect(50, boxTop, 500, boxHeight)
  .stroke("#dddddd");

const labelX = 70;
const valueX = 50;
const valueWidth = 500;

doc.fontSize(11);

// Base Amount
doc.text("Base Amount", labelX, boxTop + 15);
doc.text(`₹ ${data.baseAmount}`, valueX, boxTop + 15, {
  width: valueWidth - 20,
  align: "right"
});

// GST
doc.text("GST (18%)", labelX, boxTop + 35);
doc.text(`₹ ${data.taxAmount}`, valueX, boxTop + 35, {
  width: valueWidth - 20,
  align: "right"
});

// Total Paid
doc.fontSize(12).font("Helvetica-Bold");
doc.text("Total Paid", labelX, boxTop + 60);
doc.text(`₹ ${data.amount}`, valueX, boxTop + 60, {
  width: valueWidth - 20,
  align: "right"
});

doc.font("Helvetica"); // reset font

doc.moveDown(4);

  /* =========================
     TAX NOTE
  ========================== */
  doc
    .fontSize(9)
    .fillColor("gray")
    .text("GST charged at 18% and included in the total amount.");

  doc.moveDown(2);

  /* =========================
     SELLER DETAILS
  ========================== */
  // doc.fontSize(10).fillColor("#000").text("Seller Details");
  doc.moveDown(0.5);

  doc.fontSize(9);
  doc.text("SnehaBandh");
  doc.text("Email: support@matrimonyapp.com");
  doc.text("GSTIN: 27XXXXXXXXXX1Z5");

  doc.moveDown(2);

  /* =========================
     FOOTER
  ========================== */
  doc
    .fontSize(8)
    .fillColor("gray")
    .text(
      "This is a system-generated invoice. No signature required.",
      { align: "center" }
    );
  doc.end();
};

export default generateInvoicePDF;
