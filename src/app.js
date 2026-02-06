import "dotenv/config";
import express from "express";
import cors from "cors";

import customerRoutes from "./routes/customerRoutes.js";
// import invoiceRoutes from "./routes/invoiceRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import securityRoutes from "./routes/securityRoutes.js";
// import dashboardRoutes from "./routes/dashboardRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";








import { errorHandler } from "./middleware/errorMiddleware.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/security", securityRoutes);


// Error Handler (ALWAYS LAST)
app.use(errorHandler);

export default app;
