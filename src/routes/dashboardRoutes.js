import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getDashboardSummary,
  getStockSummary,
  getDevices,
  getLowStockItems
} from "../controllers/dashboardController.js"

import { createInvoice } from "../controllers/invoiceController.js";

const router = express.Router();

router.post("/invoices", authMiddleware, createInvoice);

router.get("/summary", authMiddleware, getDashboardSummary);
router.get("/stock-summary", authMiddleware, getStockSummary);
router.get("/devices", authMiddleware, getDevices);
// router.get("/low-stock", authMiddleware, getLowStockItems);
// router.get("/devices-data", authMiddleware, getDevicesData);

// router.get("/low-stock", authMiddleware, getLowStockItems);
router.get("/low-stock", authMiddleware, getLowStockItems);


export default router;
