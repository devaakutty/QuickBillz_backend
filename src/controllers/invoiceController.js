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
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { customer: true, items: true },
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // ===== CALCULATIONS =====
    const subTotal = invoice.items.reduce((s, i) => s + i.amount, 0);
    const tax = subTotal * 0.05;
    const gst = subTotal * 0.18;
    const total = subTotal + tax + gst;

    // ===== THERMAL SIZE (80mm) =====
    const doc = new PDFDocument({
      size: [226, 650],
      margin: 10,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${invoice.invoiceNo}.pdf`
    );

    doc.pipe(res);

    // ===== MONOSPACE FONT (VERY IMPORTANT) =====
    doc.font("Courier").fontSize(9);

    const line = "--------------------------------";

    // ===== HEADER =====
    doc.text("YOUR SHOP NAME", { align: "center" });
    doc.text("Chennai, Tamil Nadu", { align: "center" });
    doc.text("Ph: 9876543210", { align: "center" });
    doc.text(line);

    // ===== INVOICE INFO =====
    doc.text(`Invoice: ${invoice.invoiceNo}`);
    doc.text(`Date: ${new Date(invoice.createdAt).toDateString()}`);
    doc.text(`Customer: ${invoice.customer.name}`);
    doc.text(`Phone: ${invoice.customer.phone ?? "-"}`);
    doc.text(line);

    // ===== TABLE HEADER =====
    doc.text("ITEM        QTY      AMT");

    // ===== ITEMS =====
    invoice.items.forEach((item) => {
      const name = item.productName.padEnd(12, " ");
      const qty = String(item.quantity).padEnd(5, " ");
      const amt = item.amount.toFixed(2).padStart(7, " ");

      doc.text(`${name}${qty}${amt}`);
    });

    doc.text(line);

    // ===== TOTALS =====
    doc.text(`Sub Total          ₹${subTotal.toFixed(2)}`);
    doc.text(`Tax (5%)           ₹${tax.toFixed(2)}`);
    doc.text(`GST (18%)          ₹${gst.toFixed(2)}`);
    doc.text(line);
    doc.text(`TOTAL              ₹${total.toFixed(2)}`);
    doc.text(line);

    // ===== FOOTER =====
    doc.text("Thank you for shopping!", { align: "center" });
    doc.text("Visit Again 😊", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("PDF Error:", err);
    res.status(500).json({ message: err.message });
  }
};
