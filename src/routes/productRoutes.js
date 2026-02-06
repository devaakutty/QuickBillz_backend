import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  bulkCreateProducts
} from "../controllers/productController.js";

const router = express.Router();

router.post("/", authMiddleware, createProduct);
router.get("/", authMiddleware, getProducts);
router.get("/:id", authMiddleware, getProductById);
router.put("/:id", authMiddleware, updateProduct);
router.delete("/:id", authMiddleware, deleteProduct);
router.post("/bulk", authMiddleware, bulkCreateProducts);

export default router;
