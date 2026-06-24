const Client = require("../models/Client");
const { processMessage, resetConversation } = require("./botEngine");
const { processPersonalMessage } = require("./personalBotEngine");
const axios = require("axios");

const isClientActive = (c) => {
  if (c.overrideActive) return true;
  if (!c.planEndDate) return false;
  return new Date() <= new Date(c.planEndDate);
};

const handleWebhook = async (req, res) => {
  res.sendStatus(200);
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const messageObj = change?.messages?.[0];

    if (!messageObj) return;

    const phone = messageObj.from;
    const message = messageObj.text?.body;
    const phoneNumberId = change?.metadata?.phone_number_id;

    if (!phone || !message || !phoneNumberId) return;

    console.log(`📩 Message from ${phone}: ${message}`);

    const allClients = await Client.find({});
    const client = allClients.find(c => c.whatsapp?.phoneId === phoneNumberId);

    if (!client || !isClientActive(client)) {
      console.log("❌ Client not found for phoneId:", phoneNumberId);
      return;
    }

    console.log(`✅ Client found: ${client.name}`);

    const result = client.brand === "Personal"
      ? await processPersonalMessage(client._id, phone, message, client)
      : await processMessage(client._id, phone, message, client);

    if (!result || !result.reply) return;

    await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: result.reply }
      },
      { headers: { Authorization: `Bearer ${client.whatsapp.metaAccessToken}` } }
    );

    console.log(`✅ Reply sent to ${phone}`);

  } catch (e) {
    console.error("Webhook error:", e.message);
  }
};

const simulateWebhook = async (req, res) => {
  try {
    const { clientId, phone, message } = req.body;
    if (!clientId || !phone || !message) {
      return res.status(400).json({ error: "clientId, phone, message required" });
    }

    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ error: "Client not found" });

    const result = client.brand === "Personal"
      ? await processPersonalMessage(client._id, phone, message, client)
      : await processMessage(client._id, phone, message, client);

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