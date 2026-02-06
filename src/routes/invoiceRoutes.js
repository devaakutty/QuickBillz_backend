import express from "express";
import {
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  markInvoiceAsPaid,
  createInvoice,
} from "../controllers/invoiceController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔐 PROTECT ALL INVOICE ROUTES
router.use(authMiddleware);

router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);
router.put("/:id", updateInvoice);
router.put("/:id/pay", markInvoiceAsPaid);
router.delete("/:id", deleteInvoice);
router.get("/:id/pdf", downloadInvoicePdf);

export default router;
