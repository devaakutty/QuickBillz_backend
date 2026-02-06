import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getMe, updateMe, deleteMe } from "../controllers/userController.js";

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);
router.delete("/me", authMiddleware, deleteMe);

export default router;
