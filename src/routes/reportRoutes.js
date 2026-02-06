import express from "express";
import {
  getSalesReport,
  profitLossReport,
  gstReport,
} from "../controllers/reportController.js";

const router = express.Router();

router.get("/sales", getSalesReport);
router.get("/profit-loss", profitLossReport);
router.get("/gst", gstReport);

export default router;
