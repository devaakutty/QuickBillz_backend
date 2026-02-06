import prisma from "../models/prisma.js";

// DASHBOARD SUMMARY

export const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const [paidInvoices, unpaidInvoices, expenses] =
      await Promise.all([
        prisma.invoice.aggregate({
          where: { userId, status: "PAID" },
          _sum: { total: true },
        }),

        prisma.invoice.aggregate({
          where: { userId, status: "UNPAID" },
          _sum: { total: true },
        }),

        prisma.expense.aggregate({
          where: { userId },
          _sum: { amount: true },
        }),
      ]);

    res.json({
      totalSales: paidInvoices._sum.total ?? 0,
      receivedAmount: paidInvoices._sum.total ?? 0,
      pendingAmount: unpaidInvoices._sum.total ?? 0,
      totalExpense: expenses._sum.amount ?? 0,
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({
      message: "Failed to load dashboard data",
    });
  }
};


// GET STOCK SUMMARY
 export const getStockSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const LOW_STOCK_THRESHOLD = 20;

    // 1️⃣ Total products
    const totalProducts = await prisma.product.count({
      where: { userId },
    });

    // 2️⃣ Active products
    const activeProducts = await prisma.product.count({
      where: {
        userId,
        isActive: true,
      },
    });

    // 3️⃣ Total stock quantity
    const totalStockAgg = await prisma.product.aggregate({
      where: { userId },
      _sum: {
        stock: true,
      },
    });

    // 4️⃣ Low stock products
    const lowStockCount = await prisma.product.count({
      where: {
        userId,
        stock: {
          lt: LOW_STOCK_THRESHOLD,
        },
      },
    });

    res.json({
      totalProducts,
      activeProducts,
      totalStock: totalStockAgg._sum.stock || 0,
      lowStockCount,
    });
  } catch (error) {
    console.error("Stock summary error:", error);
    res.status(500).json({
      message: "Stock summary not available",
    });
  }
};

// GET TOP 5 DEVICES (MOST SOLD THIS MONTH)

export const getDevices = async (req, res) => {
  try {
    const userId = req.user.id;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await prisma.invoiceItem.groupBy({
      by: ["productName"],
      where: {
        invoice: {
          userId,
          status: "PAID", // safer than type
          createdAt: {
            gte: startOfMonth,
          },
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 5,
    });

    // ✅ HANDLE EMPTY DATA SAFELY
    if (!result.length) {
      return res.json([]);
    }

    res.json(
      result.map((r) => ({
        device: r.productName || "Unknown",
        count: r._sum.quantity || 0,
      }))
    );
  } catch (err) {
    console.error("Devices chart error:", err);
    res.status(500).json({
      message: "Failed to load device data",
    });
  }
};

// GET LOW STOCK ITEMS

export const getLowStockItems = async (req, res) => {
  try {
    const userId = req.user.id;

    const LOW_STOCK_THRESHOLD = 5; // 🔥 ONLY 5 OR BELOW

    const products = await prisma.product.findMany({
      where: {
        userId,
        stock: {
          lte: LOW_STOCK_THRESHOLD, // 🔥 <= 5
        },
      },
      select: {
        id: true,
        name: true,
        stock: true,
        unit: true,
      },
      orderBy: {
        stock: "asc",
      },
    });

    res.json(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        quantity: p.stock,
        unit: p.unit,
      }))
    );
  } catch (error) {
    console.error("Low stock error:", error);
    res.status(500).json({
      message: "Failed to load low stock items",
    });
  }
};
