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

  // Color definitions
  const primaryRed = "#D32F2F";
  const darkRed = "#B71C1C";
  const lightGray = "#F5F5F5";
  const borderGray = "#E0E0E0";
  const textDark = "#212121";
  const textGray = "#757575";

  /* =========================
     HEADER SECTION
  ========================== */
  // Red header background
  doc
    .rect(0, 0, 595.28, 120)
    .fill(primaryRed);

  // Company name in white
  doc
    .fontSize(28)
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .text("SnehaBandh", 50, 35, { align: "left" });

  doc
    .fontSize(10)
    .font("Helvetica")
    .text("Matrimony Services", 50, 70);

  // Invoice title
  doc
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("TAX INVOICE", 0, 45, { align: "right", width: 545 });

  // Reset position after header
  doc.fillColor(textDark).font("Helvetica");
  doc.y = 140;

  /* =========================
     INVOICE INFORMATION BOX
  ========================== */
  const infoBoxY = doc.y;
  
  // Invoice details box (left)
  doc
    .rect(50, infoBoxY, 240, 95)
    .fillAndStroke(lightGray, borderGray);

  doc.fillColor(textDark).fontSize(10).font("Helvetica-Bold");
  doc.text("Invoice Details", 60, infoBoxY + 12);
  
  doc.font("Helvetica").fontSize(9);
  doc.text(`Invoice No:`, 60, infoBoxY + 32);
  doc.text(`Invoice Date:`, 60, infoBoxY + 48);
  doc.text(`Payment ID:`, 60, infoBoxY + 64);

  doc.font("Helvetica-Bold");
  doc.text(data.invoiceNumber, 145, infoBoxY + 32);
  doc.text(data.invoiceDate, 145, infoBoxY + 48);
  doc.text(data.paymentId, 145, infoBoxY + 64);

  // Customer details box (right)
  doc
    .rect(305, infoBoxY, 240, 95)
    .fillAndStroke(lightGray, borderGray);

  doc.fillColor(textDark).fontSize(10).font("Helvetica-Bold");
  doc.text("Bill To", 315, infoBoxY + 12);
  
  const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

const formattedName =
  [
    capitalize(data.firstName),
    capitalize(data.middleName),
    capitalize(data.lastName),
  ]
    .filter(Boolean)
    .join(" ") || "User";


  doc.font("Helvetica").fontSize(9);
  doc.text(`Name:`, 315, infoBoxY + 32);
  doc.text(`Email:`, 315, infoBoxY + 48);
  
  doc.font("Helvetica-Bold");
  doc.text(formattedName, 360, infoBoxY + 32, { width: 175 });
  doc.font("Helvetica");
  doc.text(data.email || "N/A", 360, infoBoxY + 48, { width: 175 });

  doc.y = infoBoxY + 115;

  /* =========================
     SUBSCRIPTION DETAILS TABLE
  ========================== */
  doc.moveDown(2);
  
  const tableTop = doc.y;
  const tableLeft = 50;
  const tableWidth = 495;
  const rowHeight = 35;
  const colWidths = [280, 215]; // Description, Details

  // Table header
  doc
    .rect(tableLeft, tableTop, tableWidth, 30)
    .fill(darkRed);

  doc
    .fontSize(11)
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .text("Description", tableLeft + 15, tableTop + 10, { width: colWidths[0] - 20 })
    .text("Details", tableLeft + colWidths[0] + 15, tableTop + 10, { width: colWidths[1] - 20 });

  // Table rows
  let currentY = tableTop + 30;

  // Row 1: Plan Name
  doc
    .rect(tableLeft, currentY, tableWidth, rowHeight)
    .stroke(borderGray);

  doc
    .fillColor(textDark)
    .font("Helvetica")
    .fontSize(10)
    .text("Subscription Plan", tableLeft + 15, currentY + 12, { width: colWidths[0] - 20 })
    .font("Helvetica-Bold")
    .text(data.planName, tableLeft + colWidths[0] + 15, currentY + 12, { width: colWidths[1] - 20 });

  currentY += rowHeight;

  // Row 2: Subscription Period
  doc
    .rect(tableLeft, currentY, tableWidth, rowHeight)
    .stroke(borderGray);

  doc
    .font("Helvetica")
    .text("Subscription Period", tableLeft + 15, currentY + 12, { width: colWidths[0] - 20 })
    .font("Helvetica-Bold")
    .text(`${data.startDate} to ${data.endDate}`, tableLeft + colWidths[0] + 15, currentY + 12, { width: colWidths[1] - 20 });

  currentY += rowHeight;

  // Row 3: Duration
  const getDuration = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    return months > 0 ? `${months} Month${months > 1 ? 's' : ''}` : `${diffDays} Days`;
  };

  doc
    .rect(tableLeft, currentY, tableWidth, rowHeight)
    .stroke(borderGray);

  doc
    .font("Helvetica")
    .text("Duration", tableLeft + 15, currentY + 12, { width: colWidths[0] - 20 })
    .font("Helvetica-Bold")
    .text(getDuration(data.startDate, data.endDate), tableLeft + colWidths[0] + 15, currentY + 12, { width: colWidths[1] - 20 });

  doc.y = currentY + rowHeight + 20;

  /* =========================
     AMOUNT BREAKDOWN TABLE
  ========================== */
  doc.moveDown(1);
  
  const amountTableTop = doc.y;
  const amountTableLeft = 295; // Right-aligned table
  const amountTableWidth = 250;

  // Table header
  doc
    .rect(amountTableLeft, amountTableTop, amountTableWidth, 28)
    .fill(lightGray)
    .stroke(borderGray);

  doc
    .fontSize(11)
    .fillColor(textDark)
    .font("Helvetica-Bold")
    .text("Amount Breakdown", amountTableLeft + 15, amountTableTop + 9);

  let amountY = amountTableTop + 28;

  // Base Amount row
  doc
    .rect(amountTableLeft, amountY, amountTableWidth, 30)
    .stroke(borderGray);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(textDark)
    .text("Base Amount", amountTableLeft + 15, amountY + 10)
    .text(` ${parseFloat(data.baseAmount).toFixed(2)}`, amountTableLeft + 15, amountY + 10, {
      width: amountTableWidth - 30,
      align: "right"
    });

  amountY += 30;

  // GST row
  doc
    .rect(amountTableLeft, amountY, amountTableWidth, 30)
    .stroke(borderGray);

  doc
    .text("GST (18%)", amountTableLeft + 15, amountY + 10)
    .text(` ${parseFloat(data.taxAmount).toFixed(2)}`, amountTableLeft + 15, amountY + 10, {
      width: amountTableWidth - 30,
      align: "right"
    });

  amountY += 30;

  // Total row with red background
  doc
    .rect(amountTableLeft, amountY, amountTableWidth, 35)
    .fillAndStroke(primaryRed, primaryRed);

  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor("#FFFFFF")
    .text("Total Amount Paid", amountTableLeft + 15, amountY + 11)
    .text(` ${parseFloat(data.amount).toFixed(2)}`, amountTableLeft + 15, amountY + 11, {
      width: amountTableWidth - 30,
      align: "right"
    });

  doc.y = amountY + 55;

  /* =========================
     TAX & PAYMENT INFO
  ========================== */
  doc.moveDown(2);
  
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(textGray)
    .text("• GST of 18% has been applied and is included in the total amount.", 50, doc.y);
  
  doc.moveDown(0.5);
  doc.text("• Payment received and confirmed.", 50, doc.y);

  /* =========================
     DIVIDER LINE
  ========================== */
  doc.moveDown(2);
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor(borderGray)
    .stroke();

  doc.moveDown(1.5);

  /* =========================
     SELLER DETAILS
  ========================== */
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(textDark)
    .text("Seller Information", 50, doc.y);

  doc.moveDown(0.5);

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(textGray);
  
  doc.text("SnehaBandh Matrimony Services", 50, doc.y);
  doc.text("Email: support@matrimonyapp.com", 50);
  doc.text("GSTIN: 27XXXXXXXXXX1Z5", 50);
  doc.text("Address: [Your Business Address Here]", 50);

  /* =========================
     FOOTER
  ========================== */
  // Move to bottom of page, ensuring it fits on one page
  const pageHeight = 841.89; // A4 height in points
  const footerStartY = pageHeight - 80;
  
  doc
    .fontSize(8)
    .fillColor(textGray)
    .text(
      "This is a computer-generated invoice and does not require a physical signature.",
      50,
      footerStartY,
      { align: "center", width: 495 }
    );

  doc
    .fontSize(7)
    .text(
      "Thank you for your business!",
      50,
      footerStartY + 15,
      { align: "center", width: 495 }
    );

  // Red footer bar
  doc
    .rect(0, footerStartY + 35, 595.28, 45)
    .fill(primaryRed);

  doc
    .fontSize(8)
    .fillColor("#FFFFFF")
    .text("SnehaBandh | Connecting Hearts", 0, footerStartY + 50, { align: "center", width: 595.28 });

  doc.end();
};

export default generateInvoicePDF;