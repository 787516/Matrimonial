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
    .text("Matrimony App", { align: "center" });

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

  // Left column
  doc.text(`Invoice No: ${data.invoiceNumber}`, leftX, startY);
  doc.text(`Invoice Date: ${data.invoiceDate}`, leftX, startY + 15);
  doc.text(`Payment ID: ${data.paymentId}`, leftX, startY + 30);

  // Right column
  doc.text(`Billed To: ${data.name}`, rightX, startY);
  doc.text(`Email: ${data.email || "-"}`, rightX, startY + 15);

  doc.moveDown(4);

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
  const boxTop = doc.y;
  const boxHeight = 90;

  doc
    .rect(50, boxTop, 500, boxHeight)
    .stroke("#dddddd");

  doc.fontSize(11).fillColor("#000");

  doc.text(`Base Amount`, 70, boxTop + 15);
  doc.text(`₹ ${data.baseAmount}`, 400, boxTop + 15, { align: "right" });

  doc.text(`GST (18%)`, 70, boxTop + 35);
  doc.text(`₹ ${data.taxAmount}`, 400, boxTop + 35, { align: "right" });

  doc
    .fontSize(12)
    .text(`Total Paid`, 70, boxTop + 60);

  doc
    .fontSize(12)
    .text(`₹ ${data.amount}`, 400, boxTop + 60, { align: "right" });

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
  doc.fontSize(10).fillColor("#000").text("Seller Details");
  doc.moveDown(0.5);

  doc.fontSize(9);
  doc.text("Matrimony App");
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
