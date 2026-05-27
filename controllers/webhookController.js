const Client = require("../models/Client");
const { processMessage, resetConversation } = require("./botEngine");
const { processPersonalMessage } = require("./personalBotEngine");
const axios = require("axios");

const isClientActive = (c) => {
  if (c.overrideActive) return true;
  if (!c.planEndDate) return false;
  return new Date() <= new Date(c.planEndDate);
};

// POST /api/webhook — real Meta webhook
const handleWebhook = async (req, res) => {
  res.sendStatus(200);
  try {
    const { clientId, phone, message } = req.body;
    if (!clientId || !phone || !message) return;

    const client = await Client.findById(clientId);
    if (!client || !isClientActive(client)) return;

    const result =
      client.brand === "Personal"
        ? await processPersonalMessage(clientId, phone, message, client.googleSheetUrl)
        : await processMessage(clientId, phone, message, client);
    if (!result || !result.reply) return;

    if (client.whatsapp.phoneId !== "MOCK_PHONE_ID") {
      await axios.post(
        `https://graph.facebook.com/v18.0/${client.whatsapp.phoneId}/messages`,
        {
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: result.reply }
        },
        { headers: { Authorization: `Bearer ${client.whatsapp.token}` } }
      );
    }
  } catch (e) {
    console.error("Webhook error:", e.message);
  }
};

// POST /api/webhook/simulate — Bot Tester ke liye
const simulateWebhook = async (req, res) => {
  try {
    const { clientId, phone, message } = req.body;
    if (!clientId || !phone || !message) {
      return res.status(400).json({ error: "clientId, phone, message required" });
    }

    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ error: "Client not found" });

    const result =
      client.brand === "Personal"
        ? await processPersonalMessage(clientId, phone, message, client.googleSheetUrl)
        : await processMessage(clientId, phone, message, client);

    res.json({
      success: true,
      client: client.name,
      brand: client.brand,
      phone,
      incomingMessage: message,
      botReply: result.reply
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/webhook/reset
const resetWebhook = async (req, res) => {
  try {
    const { clientId, phone } = req.body;
    await resetConversation(clientId, phone);
    res.json({ message: "Conversation reset." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { handleWebhook, simulateWebhook, resetWebhook };
