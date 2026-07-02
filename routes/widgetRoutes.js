const router = require("express").Router();
const { widgetChat, widgetConfig } = require("../controllers/widgetController");

// Public routes — no auth (apiKey in body identifies client)
router.post("/widget/chat", widgetChat);
router.get("/widget/config/:apiKey", widgetConfig);

module.exports = router;