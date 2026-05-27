const router = require("express").Router();
const {
  handleWebhook,
  simulateWebhook,
  resetWebhook
} = require("../controllers/webhookController");
const { requireAuth } = require("../middleware/auth");

// Real Meta webhook — no auth (Meta calls it)
router.post("/webhook", handleWebhook);

// Bot tester — dashboard users only
router.post("/webhook/simulate", requireAuth, simulateWebhook);
router.post("/webhook/reset", requireAuth, resetWebhook);

module.exports = router;
