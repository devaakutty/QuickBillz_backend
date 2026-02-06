import express from "express";
import {
  createCategory,
  getCategories,
} from "../controllers/categoryController.js";
import authMiddleware from "../middleware/authMiddleware.js";
// import { authMiddleware } from "../middleware/authMiddleware.js";


const router = express.Router();

// Create category
router.post("/", authMiddleware, createCategory);

// Get all categories
router.get("/", authMiddleware, getCategories);

export default router;
