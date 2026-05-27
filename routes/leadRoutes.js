const router = require("express").Router();
const { getLeads, getLeadStats, updateLead, deleteLead } = require("../controllers/leadController");
const { requireAuth } = require("../middleware/auth");

router.get("/leads", requireAuth, getLeads);
router.get("/leads/stats", requireAuth, getLeadStats);
router.put("/lead/:id", requireAuth, updateLead);
router.delete("/lead/:id", requireAuth, deleteLead);

module.exports = router;
