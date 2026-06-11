const router = require("express").Router();
const {
  handleWebhook,
  simulateWebhook,
  resetWebhook
} = require("../controllers/webhookController");
const { requireAuth } = require("../middleware/auth");
const { handleTelegramWebhook } = require("../services/telegramService");

// Real Meta webhook — no auth (Meta calls it)
router.post("/webhook", handleWebhook);

// Bot tester — dashboard users only
router.post("/webhook/simulate", requireAuth, simulateWebhook);
router.post("/webhook/reset", requireAuth, resetWebhook);

// Telegram webhook — /start command se client ko Chat ID milega
router.post("/telegram/webhook", handleTelegramWebhook);

module.exports = router;