const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  getAllConversations,
  getConversationByPhone
} = require("../controllers/conversationController");

router.get("/conversations", authenticate, getAllConversations);
router.get("/conversations/:phone", authenticate, getConversationByPhone);

module.exports = router;