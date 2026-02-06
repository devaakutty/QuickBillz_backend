import prisma from "../models/prisma.js";
import PDFDocument from "pdfkit";

/* =========================
   CREATE INVOICE
========================= */

export const createInvoice = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { invoiceNo, customerId, items } = req.body;

    if (!invoiceNo || !customerId || !Array.isArray(items)) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const invoice = await prisma.$transaction(async (tx) => {
      let total = 0;
      const invoiceItems = [];

      for (const item of items) {
        const qty = Number(item.qty);
        const rate = Number(item.rate);

        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error(`Invalid quantity for ${item.productName}`);
        }

        if (!Number.isFinite(rate) || rate < 0) {
          throw new Error(`Invalid rate for ${item.productName}`);
        }

        const product = await tx.product.findFirst({
          where: {
            name: item.productName,
            userId,
          },
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productName}`);
        }

        if (product.stock < qty) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.stock}`
          );
        }

        // ✅ DECREMENT STOCK
        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: qty,
            },
          },
        });

        invoiceItems.push({
          productId: product.id,
          productName: product.name,
          quantity: qty,
          rate,
          amount: qty * rate,
        });

        total += qty * rate;
      }

      return tx.invoice.create({
        data: {
          invoiceNo,
          total,
          status: "PAID",
          user: { connect: { id: userId } },
          customer: { connect: { id: customerId } },
          items: {
            create: invoiceItems,
          },
        },
      });
    });

    res.status(201).json(invoice);
  } catch (err) {
    console.error("❌ Create invoice error:", err.message);
    res.status(400).json({ message: err.message });
  }
};
/* =========================
   GET ALL INVOICES
========================= */
export const getInvoices = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized: user not found",
      });
    }

    const invoices = await prisma.invoice.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    res.json(invoices);
  } catch (err) {
    console.error("❌ Get invoices error:", err);
    res.status(500).json({ message: "Failed to load invoices" });
  }
};

/* =========================
   GET INVOICE BY ID
========================= */
export const getInvoiceById = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id, // 🔐 USER SCOPED
      },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   DELETE INVOICE
========================= */
export const deleteInvoice = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: req.params.id },
    });

    await prisma.invoice.delete({
      where: { id: req.params.id },
    });

    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   UPDATE INVOICE
========================= */
export const updateInvoice = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { invoiceNo, customerId, items } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({
        message: "Invoice items are required",
      });
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!existingInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const normalizedItems = items.map((item) => {
      const quantity = Number(item.quantity);
      const rate = Number(item.rate);

      if (!Number.isFinite(quantity) || !Number.isFinite(rate)) {
        throw new Error("Invalid item quantity or price");
      }

      return {
        productName: item.productName,
        quantity,
        rate,
        amount: quantity * rate,
      };
    });

    const total = normalizedItems.reduce((s, i) => s + i.amount, 0);

    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: req.params.id },
    });

    const updatedInvoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        invoiceNo,
        customerId,
        total,
        items: { create: normalizedItems },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   MARK INVOICE AS PAID
========================= */
export const markInvoiceAsPaid = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (invoice.status === "PAID") {
      return res.json(invoice);
    }

    const updated = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: "PAID" },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/// DOWNLOAD INVOICE AS PDF
export const downloadInvoicePdf = async (req, res) => {
  try {
    /* ================= AUTH & FETCH ================= */
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { customer: true, items: true },
    });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const subTotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
    const gstAmount = subTotal * 0.18;
    const grandTotal = subTotal + gstAmount;

    /* ================= 1. THE HEIGHT CALCULATION ================= */
    // We add up all sections to define the exact paper length
    const headerH = 150; 
    const itemH = invoice.items.length * 25; // Space per product row
    const footerH = 140;
    const totalHeight = headerH + itemH + footerH;

    const doc = new PDFDocument({
      size: [226, totalHeight], // 80mm width, custom length
      margins: { top: 0, bottom: 0, left: 10, right: 10 },
      autoFirstPage: false // We will add the page manually to control it
    });

    // CRITICAL: Manually add one page with NO layout breaks
    doc.addPage({
      size: [226, totalHeight],
      margins: { top: 0, bottom: 0, left: 10, right: 10 }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=invoice-${invoice.invoiceNo}.pdf`);
    doc.pipe(res);

    /* ================= 2. BRANDED HEADER ================= */
    doc.rect(0, 0, 226, 60).fill("#1a1a1a"); 
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(16).text("QuickBillz", 0, 18, { align: "center" });
    doc.fontSize(7).font("Helvetica").text("PREMIUM POS INVOICE", 0, 38, { align: "center", characterSpacing: 1.5 });

    /* ================= 3. SHOP & CUSTOMER INFO ================= */
    doc.fillColor("#000000").moveDown(3);
    doc.fontSize(8).font("Helvetica-Bold").text("INVOICEHUB STORE", { align: "center" });
    doc.font("Helvetica").fontSize(7).text("Chennai, TN | GST: 33AAAAA0000A1Z5", { align: "center" });
    
    doc.moveDown(1);
    const infoY = doc.y;
    doc.fontSize(7).font("Helvetica-Bold").text(`INV: #${invoice.invoiceNo}`, 10, infoY);
    doc.text(`DATE: ${new Date(invoice.createdAt).toLocaleDateString()}`, 130, infoY, { align: "right" });
    doc.moveDown(0.2);
    doc.font("Helvetica").text(`CUSTOMER: ${invoice.customer.name.toUpperCase()}`, 10);
    
    doc.moveDown(0.8);
    doc.moveTo(10, doc.y).lineTo(216, doc.y).lineWidth(0.5).stroke();

    /* ================= 4. COMPACT TABLE ================= */
    doc.moveDown(0.5);
    const tableTop = doc.y;
    doc.font("Helvetica-Bold").fontSize(7);
    doc.text("ITEM", 10, tableTop);
    doc.text("RATE", 100, tableTop, { width: 35, align: "right" });
    doc.text("QTY", 140, tableTop, { width: 25, align: "right" });
    doc.text("TOTAL", 175, tableTop, { width: 40, align: "right" });
    
    doc.moveDown(0.4);
    doc.moveTo(10, doc.y).lineTo(216, doc.y).lineWidth(0.2).stroke();
    doc.moveDown(0.6);

    /* ================= 5. ITEMS LOOP ================= */
    invoice.items.forEach((item) => {
      const y = doc.y;
      const rate = (item.amount / item.quantity).toFixed(2);

      doc.font("Helvetica-Bold").text(item.productName.toUpperCase(), 10, y, { width: 85 });
      doc.font("Helvetica");
      doc.text(rate, 100, y, { width: 35, align: "right" });
      doc.text(item.quantity.toString(), 140, y, { width: 25, align: "right" });
      doc.font("Helvetica-Bold").text(item.amount.toFixed(2), 175, y, { width: 40, align: "right" });
      
      doc.moveDown(1.2); 
    });

    /* ================= 6. SUMMARY BOX ================= */
    doc.moveDown(0.5);
    doc.moveTo(10, doc.y).lineTo(216, doc.y).lineWidth(0.5).stroke();
    doc.moveDown(0.8);

    const summaryY = doc.y;
    doc.font("Helvetica").fontSize(7);
    doc.text("SUBTOTAL", 110, summaryY);
    doc.text(`₹${subTotal.toFixed(2)}`, 175, summaryY, { align: "right" });

    doc.text("GST (18%)", 110, summaryY + 12);
    doc.text(`₹${gstAmount.toFixed(2)}`, 175, summaryY + 12, { align: "right" });

    // Bold Total Bar
    doc.rect(105, summaryY + 25, 111, 20).fill("#1a1a1a");
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);
    doc.text("GRAND TOTAL", 112, summaryY + 31);
    doc.text(`₹${grandTotal.toFixed(2)}`, 160, summaryY + 31, { width: 55, align: "right" });

    /* ================= 7. FOOTER ================= */
    // doc.fillColor("#000000").moveDown(5);
    // doc.font("Helvetica-Oblique").fontSize(8).text("Thank you for choosing QuickBillz!", { align: "center" });
    
    // doc.moveDown(1.5);
    // doc.font("Helvetica").fontSize(7).text("- - - - - - - - - - - - - - - - - - - - - - - - - -", { align: "center" });
    // doc.text("✂ Cut Here", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("❌ PDF Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};