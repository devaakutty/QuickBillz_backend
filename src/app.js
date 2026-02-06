import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import securityRoutes from "./routes/securityRoutes.js";

import { errorHandler } from "./middleware/errorMiddleware.js";

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://your-vercel-app.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

//* ================= DB TEST ================= */

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      ok: true,
      time: result.rows[0].now,
    });
  } catch (err) {
    console.error("DB TEST FAILED:", err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

/* ================= ROUTES ================= */

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/products", productRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/security", securityRoutes);

/* ================= HEALTH CHECK ================= */

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ================= ERROR HANDLER ================= */

app.use(errorHandler);

export default app;
