import prisma from "../models/prisma.js";

/* =====================================================
   SALES REPORT
   GET /api/reports/sales
===================================================== */
export const getSalesReport = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      select: {
        id: true,
        invoiceNo: true,
        total: true,
        status: true,
        createdAt: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ invoices });
  } catch (error) {
    console.error("❌ Sales report error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   PROFIT & LOSS REPORT
   GET /api/reports/profit-loss
===================================================== */
export const profitLossReport = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      select: {
        total: true,
        createdAt: true,
        items: {
          select: {
            amount: true,
          },
        },
      },
    });

    /* ---------- TOTALS ---------- */
    const revenue = invoices.reduce(
      (sum, inv) => sum + inv.total,
      0
    );

    // Assume cost = 70% of item amount
    const cost = invoices.reduce((sum, inv) => {
      const itemCost = inv.items.reduce(
        (s, i) => s + i.amount * 0.7,
        0
      );
      return sum + itemCost;
    }, 0);

    const profit = revenue - cost;

    /* ---------- MONTHLY DATA ---------- */
    const monthlyMap = {};

    invoices.forEach((inv) => {
      const month = inv.createdAt.toLocaleString("en-IN", {
        month: "short",
        year: "numeric",
      });

      if (!monthlyMap[month]) {
        monthlyMap[month] = {
          month,
          revenue: 0,
          expense: 0,
        };
      }

      monthlyMap[month].revenue += inv.total;

      const expense = inv.items.reduce(
        (s, i) => s + i.amount * 0.7,
        0
      );

      monthlyMap[month].expense += expense;
    });

    res.json({
      revenue: Number(revenue.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      monthly: Object.values(monthlyMap),
    });
  } catch (error) {
    console.error("❌ Profit & Loss error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   GST REPORT
   GET /api/reports/gst
===================================================== */
export const gstReport = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      select: {
        total: true,
        createdAt: true,
      },
    });

    let taxableSales = 0;
    let outputGST = 0;
    let inputGST = 0; // future purchase GST

    const monthlyMap = {};

    invoices.forEach((inv) => {
      // assuming total is GST inclusive (18%)
      const taxable = inv.total / 1.18;
      const gst = inv.total - taxable;

      taxableSales += taxable;
      outputGST += gst;

      const month = inv.createdAt.toLocaleString("en-IN", {
        month: "short",
        year: "numeric",
      });

      if (!monthlyMap[month]) {
        monthlyMap[month] = {
          month,
          taxable: 0,
          output: 0,
          input: 0,
        };
      }

      monthlyMap[month].taxable += taxable;
      monthlyMap[month].output += gst;
    });

    res.json({
      taxableSales: Math.round(taxableSales),
      outputGST: Math.round(outputGST),
      inputGST: Math.round(inputGST),
      netGST: Math.round(outputGST - inputGST),
      monthly: Object.values(monthlyMap),
    });
  } catch (error) {
    console.error("❌ GST report error:", error);
    res.status(500).json({ message: error.message });
  }
};
