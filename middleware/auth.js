// JWT auth middleware
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production-please";

/**
 * requireAuth — populates req.user if a valid JWT is in Authorization header.
 * Sends 401 if missing/invalid.
 */
const requireAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token" });

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, role, clientId }
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

/** requireAdmin — must run after requireAuth */
const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
};

/** Signs a token from a user record */
const signToken = (user) =>
  jwt.sign(
    { id: user.id || user._id, email: user.email, role: user.role, clientId: user.clientId || user.client_id },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

module.exports = { requireAuth, requireAdmin, signToken };
