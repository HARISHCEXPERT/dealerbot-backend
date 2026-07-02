// Widget chat controller — public endpoint for web chat widget
const Anthropic = require("@anthropic-ai/sdk");
const Session = require("../models/Session");
const Client = require("../models/Client");
const { saveLead } = require("../services/leadService");
const crypto = require("crypto");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const buildWidgetPrompt = (client) => `You are the AI chat assistant for ${client.name}${client.city ? " in " + client.city : ""}.

BUSINESS DETAILS:
- Business: ${client.name}
- Type: ${client.brand}
- Address: ${client.botProfile?.address || "Contact us for location"}
- Contact: ${client.botProfile?.phone || "Use this chat"}
- Hours: ${client.botProfile?.hours || "Standard business hours"}

CURRENT OFFERS:
${client.botProfile?.offers || "Ask us about current offers"}

ADDITIONAL INFO:
${client.botProfile?.extraInfo || ""}

YOUR ROLE:
- Reply in the visitor's language — English, Hindi, or Hinglish
- Be helpful, friendly, and concise — 2-3 lines max
- Answer questions about products, services, pricing, hours
- Gently capture name and phone number when visitor shows interest
- If you can't help — suggest contacting the business directly
- If asked "Are you AI?" — answer honestly

LEAD EXTRACTION — IMPORTANT:
After every reply, on a new line add exactly:
LEADDATA:{"name":"","phone":"","interest":"","score":""}

Rules:
- name: fill only if visitor mentioned it
- phone: fill only if visitor gave a phone number
- interest: short description of what they want
- score: "hot" (ready to buy/visit) / "warm" (interested) / "cold" (browsing)`;

// POST /api/widget/chat — public, no auth, apiKey identifies client
const widgetChat = async (req, res) => {
  try {
    const { apiKey, message, visitorId } = req.body;

    if (!apiKey || !message || !visitorId) {
      return res.status(400).json({ error: "apiKey, message and visitorId required" });
    }

    // apiKey = client id (simple v1 — baad mein proper API keys table banayenge)
    const client = await Client.findById(apiKey);
    if (!client) return res.status(401).json({ error: "Invalid API key" });

    // Widget sessions use "web_" prefix to separate from WhatsApp
    const widgetPhone = `web_${visitorId}`;

    let session = await Session.findOne({ clientId: client._id, phone: widgetPhone });
    if (!session) {
      session = Session.build({
        clientId: client._id,
        phone: widgetPhone,
        step: "active",
        data: { history: [], channel: "widget" },
        messages: []
      });
    }

    session.messages.push(message);
    session.updatedAt = new Date();

    const history = session.data.history || [];
    const claudeMessages = [];
    for (const h of history) {
      if (h.role === "user") claudeMessages.push({ role: "user", content: h.text });
      if (h.role === "model") claudeMessages.push({ role: "assistant", content: h.text });
    }
    claudeMessages.push({ role: "user", content: message });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: buildWidgetPrompt(client),
      messages: claudeMessages
    });

    const fullResponse = response.content[0].text;

    let reply = fullResponse;
    let leadData = null;

    if (fullResponse.includes("LEADDATA:")) {
      const parts = fullResponse.split("LEADDATA:");
      reply = parts[0].trim();
      try {
        leadData = JSON.parse(parts[1].trim());
      } catch (e) {
        console.log("Widget lead parse error:", e.message);
      }
    }

    history.push({ role: "user", text: message });
    history.push({ role: "model", text: fullResponse });
    if (history.length > 20) history.splice(0, 2);
    session.data.history = history;

    if (leadData) {
      if (leadData.name) session.data.name = leadData.name;
      if (leadData.phone) session.data.detectedPhone = leadData.phone;
      if (leadData.interest) session.data.interest = leadData.interest;

      const shouldSave =
        (leadData.name && leadData.name !== "") ||
        (leadData.phone && leadData.phone !== "") ||
        leadData.score === "hot";

      if (shouldSave) {
        await saveLead(client, widgetPhone, leadData.interest || "Website Inquiry", session.messages);
      }
    }

    await session.save();

    res.json({ reply });
  } catch (err) {
    console.error("Widget chat error:", err.message);
    res.status(500).json({ reply: "Sorry, something went wrong. Please try again." });
  }
};

// GET /api/widget/config/:apiKey — widget ko client ka naam/theme do
const widgetConfig = async (req, res) => {
  try {
    const client = await Client.findById(req.params.apiKey);
    if (!client) return res.status(404).json({ error: "Invalid API key" });

    res.json({
      businessName: client.name,
      welcomeMessage: `Hi! 👋 Welcome to ${client.name}. How can I help you today?`,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { widgetChat, widgetConfig };