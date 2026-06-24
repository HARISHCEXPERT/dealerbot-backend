const Anthropic = require("@anthropic-ai/sdk");
const Session = require("../models/Session");
const { saveLead } = require("../services/leadService");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const buildSystemPrompt = (dealerClient) => `You are the official WhatsApp AI Assistant for ${dealerClient.name} — a ${dealerClient.brand} dealership in ${dealerClient.city}.

SHOWROOM DETAILS:
- Brand: ${dealerClient.brand}
- City: ${dealerClient.city}
- Address: ${dealerClient.botProfile?.address || "Visit our showroom"}
- Contact: ${dealerClient.botProfile?.phone || "Contact the dealership"}
- Business Hours: ${dealerClient.botProfile?.hours || "Mon–Sat, 9AM–6PM"}

CURRENT OFFERS:
${dealerClient.botProfile?.offers || "Please visit or contact us for latest offers"}

ADDITIONAL INFO:
${dealerClient.botProfile?.extraInfo || ""}

YOUR ROLE:
- Reply in the same language as the customer — English if they write in English, Hinglish otherwise
- ALWAYS use respectful language — "aap/aapko/aapka" never "tu/tera/tujhe"
- Keep replies short and clear — 3-4 lines max on WhatsApp
- Help with: bike details, pricing, test ride booking, service appointments
- Always try to capture name and phone number — gently and naturally
- When customer seems ready — suggest showroom visit or callback
- If asked "Are you AI?" — answer honestly
- Never give false information

LEAD EXTRACTION — IMPORTANT:
After every reply, on a new line add exactly:
LEADDATA:{"name":"","phone":"","interest":"","score":""}

Rules:
- name: fill only if customer mentioned it
- phone: fill only if customer gave a 10-digit number
- interest: "Bike Details" / "Service Booking" / "Test Ride" / "Price Inquiry" / "General"
- score: "hot" (ready to buy/visit) / "warm" (interested) / "cold" (just browsing)`;

const processMessage = async (clientId, phone, message, dealerClient) => {
  let session = await Session.findOne({ clientId, phone });
  if (!session) {
    session = Session.build({
      clientId,
      phone,
      step: "active",
      data: { history: [] },
      messages: []
    });
  }

  session.messages.push(message);
  session.updatedAt = new Date();

  try {
    const history = session.data.history || [];

    const claudeMessages = [];
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      if (h.role === "user") claudeMessages.push({ role: "user", content: h.text });
      if (h.role === "model") claudeMessages.push({ role: "assistant", content: h.text });
    }
    claudeMessages.push({ role: "user", content: message });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: buildSystemPrompt(dealerClient),
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
        console.log("Lead parse error:", e.message);
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
      if (leadData.score) session.data.score = leadData.score;

      const shouldSave =
        (leadData.name && leadData.name !== "") ||
        (leadData.phone && leadData.phone !== "") ||
        leadData.score === "hot" ||
        leadData.score === "warm";

      if (shouldSave) {
        await saveLead(
          dealerClient,
          phone,
          session.data.interest || "General",
          session.messages
        );
      }
    }

    await session.save();
    return { reply };

  } catch (err) {
    console.error("Claude error:", err.message);
    return {
      reply: "There seems to be a technical issue 😅 Please try again in a moment or contact the showroom directly."
    };
  }
};

const resetConversation = async (clientId, phone) => {
  await Session.findOneAndDelete({ clientId, phone });
};

module.exports = { processMessage, resetConversation };