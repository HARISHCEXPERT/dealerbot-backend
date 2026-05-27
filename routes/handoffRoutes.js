const router = require("express").Router();
const {
  listHandoffs,
  createHandoff,
  resolveHandoff,
  deleteHandoff
} = require("../controllers/handoffController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.get("/handoffs", requireAuth, listHandoffs);
router.post("/handoff", createHandoff); // bot creates — no auth needed
router.put("/handoff/:id/resolve", requireAuth, requireAdmin, resolveHandoff);
router.delete("/handoff/:id", requireAuth, requireAdmin, deleteHandoff);

module.exports = router;
