import prisma from "../models/prisma.js";

/* =====================================================
   CREATE CUSTOMER
===================================================== */
export const createCustomer = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone required" });
    }

    const existing = await prisma.customer.findUnique({
      where: { phone },
    });

    if (existing && existing.userId === userId) {
      return res.status(400).json({ message: "Customer already exists" });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        userId,
      },
    });

    res.json(customer);
  } catch (error) {
    console.error("❌ Create customer error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   GET ALL CUSTOMERS (LOGGED-IN USER ONLY)
===================================================== */
export const getCustomers = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const customers = await prisma.customer.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch customers" });
  }
};

/* =====================================================
   GET CUSTOMER BY ID
===================================================== */
export const getCustomerById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const customer = await prisma.customer.findFirst({
      where: { id, userId },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch customer" });
  }
};

/* =====================================================
   UPDATE CUSTOMER
===================================================== */
export const updateCustomer = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const existing = await prisma.customer.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: req.body.name,
        phone: req.body.phone,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update customer" });
  }
};

/* =====================================================
   DELETE CUSTOMER (SAFE CASCADE)
===================================================== */
export const deleteCustomer = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const customer = await prisma.customer.findFirst({
      where: { id, userId },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await prisma.payment.deleteMany({
      where: {
        invoice: { customerId: id },
      },
    });

    await prisma.invoiceItem.deleteMany({
      where: {
        invoice: { customerId: id },
      },
    });

    await prisma.invoice.deleteMany({
      where: { customerId: id },
    });

    await prisma.customer.delete({
      where: { id },
    });

    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    console.error("❌ Delete customer error:", err);
    res.status(500).json({ message: "Failed to delete customer" });
  }
};
