import prisma from "../models/prisma.js";

/* ================= CREATE PRODUCT ================= */

export const createProduct = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, rate, unit, stock } = req.body;

    if (!name || rate === undefined) {
      return res.status(400).json({
        message: "Product name and rate are required",
      });
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        rate: Number(rate),
        unit: unit ? unit.trim() : null,
        stock: Number(stock) || 0,
        isActive: true,
        user: {
          connect: { id: userId },
        },
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET ALL PRODUCTS ================= */

export const getProducts = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const products = await prisma.product.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(products);
  } catch (error) {
    console.error("Get Products Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET PRODUCT BY ID ================= */

export const getProductById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);

    const product = await prisma.product.findFirst({
      where: {
        id,
        userId,
        isActive: true,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Get Product By ID Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE PRODUCT ================= */

export const updateProduct = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);
    const { name, rate, unit, isActive } = req.body;

    const product = await prisma.product.findFirst({
      where: { id, userId },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        rate: rate !== undefined ? Number(rate) : undefined,
        unit: unit !== undefined ? (unit ? unit.trim() : null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE (SOFT DELETE) ================= */

export const deleteProduct = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);

    const product = await prisma.product.findFirst({
      where: { id, userId },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: "Product disabled successfully" });
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ message: error.message });
  }
};
