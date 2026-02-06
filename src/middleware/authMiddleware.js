import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token missing or invalid" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id) {
      return res.status(401).json({
        message: "Invalid token payload (id missing)",
      });
    }

    // ✅ THIS IS THE KEY FIX
    req.user = { id: decoded.id };

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Session expired. Please login again.",
    });
  }
};

export default authMiddleware;
