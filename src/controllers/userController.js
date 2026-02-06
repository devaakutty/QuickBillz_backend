import prisma from "../models/prisma.js";
/* ================= GET PROFILE ================= */
export const getMe = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        company: true,
        website: true,
        gstNumber: true,
        address: true,
        country: true,
        state: true,
        city: true,
        zip: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("GET /users/me error:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

/* ================= UPDATE PROFILE ================= */
export const updateMe = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      firstName,
      lastName,
      phone,
      company,
      website,
      gstNumber,
      address,
      country,
      state,
      city,
      zip,
    } = req.body;

    // ✅ Phone validation (server-side)
    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        message: "Mobile number must be exactly 10 digits",
      });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName,
        lastName,
        phone,
        company,
        website,
        gstNumber,
        address,
        country,
        state,
        city,
        zip,
      },
    });

    res.json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("PUT /users/me error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

/* ================= DELETE ACCOUNT ================= */
export const deleteMe = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("❌ deleteMe error:", err);
    res.status(500).json({ message: err.message });
  }
};
