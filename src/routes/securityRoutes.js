import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  changePassword,
  deleteAccount,
} from "../controllers/securityController.js";
import {
  sendOTP,
  verifyOTP,
} from "../controllers/otpController.js";

const router = express.Router();

/* PASSWORD */
router.put("/change-password", authMiddleware, changePassword);

/* OTP */
router.post("/send-otp", authMiddleware, sendOTP);
router.post("/verify-otp", authMiddleware, verifyOTP);

/* DELETE */
router.delete("/delete-account", authMiddleware, deleteAccount);

export default router;
