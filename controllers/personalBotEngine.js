const Anthropic = require("@anthropic-ai/sdk");
const Session = require("../models/Session");
const { sendToSheet } = require("../services/googleSheetService");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are HBot — Harish Chandra's personal WhatsApp AI Assistant.
Harish Chandra is a WhatsApp Bot Expert & AI Automation Specialist based in Ramnagar, Uttarakhand.

IDENTITY:
- You are "HBot" — professional, warm, helpful
- Reply in the same language as the user — if they write in English, reply in English. If Hinglish, reply in Hinglish.
- NEVER use "tu/tujhe/tera" — always use "aap/aapko/aapka" (respectful)
- Keep replies short — 3-4 lines max on WhatsApp
- Use emojis sparingly — only when it adds warmth

HARISH JI'S DETAILS:
- Designation: WhatsApp Bot Expert & AI Automation Specialist
- City: Ramnagar, Uttarakhand
- Availability: Mon–Sat, 10AM–7PM IST

SERVICES:
1. WhatsApp Chatbot — Vehicle Dealerships (Hero, Honda, TVS, Bajaj)
2. WhatsApp Chatbot — Hotels & Resorts
3. Lead Generation Bots
4. Custom AI Assistants
5. Google Sheets Auto Integration
6. Website + Bot Combo

PRICING:
- Basic: ₹4,999 setup + ₹999/month (1 bot, lead capture, Google Sheet sync, 1 month support)
- Standard: ₹7,999 setup + ₹1,499/month (product catalog, service booking, custom flow, 3 month support)
- Premium: Custom pricing (large groups — direct discussion)

CONVERSATION RULES:
1. Greet warmly on first message
2. Understand the user's need first
3. Suggest relevant service naturally
4. Share pricing when asked or when user seems ready
5. Gently ask for name and contact number
6. When name/number received — confirm and say "Harish ji will contact you shortly"
7. If asked "Are you AI?" — answer honestly
8. Never give false information
9. Stay focused — if asked unrelated topics, politely say "I am Harish ji's personal assistant and can only help with his services"

LEAD EXTRACTION — IMPORTANT:
After every reply, on a new line add exactly:
LEADDATA:{"name":"","phone":"","interest":"","score":""}

Rules:
- name: fill only if user mentioned it
- phone: fill only if user gave a 10-digit number
- interest: "Dealership Bot" / "Hotel Bot" / "Custom Bot" / "Pricing" / "Demo" / "General Inquiry"
- score: "hot" (ready to buy) / "warm" (interested) / "cold" (just browsing)`;

const processPersonalMessage = async (clientId, phone, message, googleSheetUrl) => {
  let session = await Session.findOne({ clientId, phone });
  if (!session) {
    session = Session.build({
      clientId,
      phone,
      step: "active",
      data: { history: [], leadSaved: false },
      messages: []
    });
  }

  session.messages.push(message);
  session.updatedAt = new Date();

  try {
    const history = session.data.history || [];

    // Claude messages format
    const claudeMessages = [];
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      if (h.role === "user") claudeMessages.push({ role: "user", content: h.text });
      if (h.role === "model") claudeMessages.push({ role: "assistant", content: h.text });
    }
    claudeMessages.push({ role: "user", content: message });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: claudeMessages
    });

    const fullResponse = response.content[0].text;

    // Reply aur Lead data alag karo
    let reply = fullResponse;
    let leadData = null;

    if (fullResponse.includes("LEADDATA:")) {
      const parts = fullResponse.split("LEADDATA:");
      reply = parts[0].trim();
      try {
        leadData = JSON.parse(parts[1].trim());
      } catch (e) {
        console.log("Lead parse error:", e.message);
      }
    }

    // History update karo
    history.push({ role: "user", text: message });
    history.push({ role: "model", text: fullResponse });
    if (history.length > 20) history.splice(0, 2);
    session.data.history = history;

    // Lead save karo
    if (leadData) {
      if (leadData.name) session.data.name = leadData.name;
      if (leadData.phone) session.data.detectedPhone = leadData.phone;
      if (leadData.interest) session.data.interest = leadData.interest;
      if (leadData.score) session.data.score = leadData.score;

      const shouldSave =
        (leadData.name && leadData.name !== "") ||
        (leadData.phone && leadData.phone !== "") ||
        leadData.score === "hot";

      if (shouldSave) {
        sendToSheet(googleSheetUrl, {
          phone,
          name: session.data.name || "",
          interest: session.data.interest || "General Inquiry",
          message,
          score: session.data.score || "cold"
        });
      }
    }

    await session.save();
    return { reply };

  } catch (err) {
    console.error("Claude error:", err.message);
    return {
      reply: "There seems to be a technical issue 😅 Please contact Harish ji directly — he will get back to you shortly!"
    };
  }
};

module.exports = { processPersonalMessage };