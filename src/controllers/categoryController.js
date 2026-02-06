import prisma from "../models/prisma.js";

/**
 * CREATE CATEGORY
 * POST /api/categories
 */
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const category = await prisma.category.create({
      data: { name },
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET ALL CATEGORIES
 * GET /api/categories
 */
export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
