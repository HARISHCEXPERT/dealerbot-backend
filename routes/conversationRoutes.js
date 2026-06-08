const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const {
  getAllConversations,
  getConversationByPhone
} = require("../controllers/conversationController");

router.get("/conversations", requireAuth, getAllConversations);
router.get("/conversations/:phone", requireAuth, getConversationByPhone);

module.exports = router;