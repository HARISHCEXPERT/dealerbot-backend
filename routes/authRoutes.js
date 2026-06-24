const router = require("express").Router();
const {
  metaCallback,
  getOnboardStatus,
  getOnboardUrl
} = require("../controllers/authController");
const {
  login,
  forgotPassword,
  resetPassword,
  listUsers,
  createUser,
  deleteUser,
  adminResetPassword,
  me
} = require("../controllers/userAuthController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// ---- Public ----
router.post("/auth/login", login);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password", resetPassword);
router.post("/auth/signup", signup);

// ---- Authenticated ----
router.get("/auth/me", requireAuth, me);

// ---- Admin only — user management ----
router.get("/auth/users", requireAuth, requireAdmin, listUsers);
router.post("/auth/create-user", requireAuth, requireAdmin, createUser);
router.delete("/auth/user/:id", requireAuth, requireAdmin, deleteUser);
router.post("/auth/admin-reset", requireAuth, requireAdmin, adminResetPassword);

// ---- Meta WhatsApp OAuth ----
router.get("/auth/meta/callback", metaCallback);
router.get("/auth/status/:clientId", getOnboardStatus);
router.get("/auth/onboard-url/:clientId", getOnboardUrl);

module.exports = router;
