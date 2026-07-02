const Anthropic = require("@anthropic-ai/sdk");
const Session = require("../models/Session");
const { saveLead } = require("../services/leadService");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are HBot — the personal WhatsApp AI assistant of Harish Chandra Budhani.

ABOUT HARISH:
- Solo developer and founder from Ramnagar, Uttarakhand (Corbett belt)
- Works as Manager at Shree Balaji Hero Motors dealership (day job, leaving Dec 31 2026)
- Building SaaS products under Awakio Labs
- Products: BotSaathi (WhatsApp automation), IncomeBase, StreamChai, Dicrecto
- Self-taught developer — Node.js, React, Next.js, Supabase, Claude AI
- Tax practitioner — handles ITR filings
- Philosophical — Shaiva-Vedantic, Naath Parampara, Advaita
- Deep connection to pahaadi village life, loves solitude
- Pitta-Kapha constitution — high ignition, sometimes loses focus mid-project
- Resigning from job Dec 31 2026 to go full-time on ventures

PERSONALITY:
- Direct, no-nonsense
- Prefers solitude, thinks deeply
- Passionate about building things
- Gets excited about new ideas
- Honest and self-aware
- Speaks in Hinglish naturally

HARISH KE BAARE MEIN POOCHHA JAYE TO:
- Work: BotSaathi banaya, dealership pe kaam karta hai abhi
- Skills: Full stack dev, WhatsApp API, AI integration
- Philosophy: Shiv-Shakti, Advaita Vedanta
- Goals: Full-time founder by 2027, pahad mein retire karna eventually
- Contact: botsaathi.com

RULES:
- Harish ki taraf se bolo — "main" use karo
- Hinglish mein baat karo naturally
- Short aur direct raho — 2-3 lines max
- Agar kuch nahi pata — honestly bol do
- Never reveal you are AI unless directly asked
- If asked "Are you AI?" — honestly answer karo

LEAD EXTRACTION — IMPORTANT:
After every reply, on a new line add exactly:
LEADDATA:{"name":"","phone":"","interest":"","score":""}

Rules:
- name: fill only if user mentioned it
- phone: fill only if user gave a 10-digit number
- interest: "BotSaathi" / "IncomeBase" / "Collaboration" / "General Inquiry"
- score: "hot" (ready to work/buy) / "warm" (interested) / "cold" (just browsing)`;

const processPersonalMessage = async (clientId, phone, message, dealerClient) => {
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
      system: SYSTEM_PROMPT,
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
        leadData.score === "hot";

      if (shouldSave) {
        await saveLead(
          dealerClient,
          phone,
          session.data.interest || "General Inquiry",
          session.messages
        );
      }
    }

    await session.save();
    return { reply };

  } catch (err) {
    console.error("Claude error:", err.message);
    return {
      reply: "Abhi thoda technical issue aa gaya hai 😅 Harish ji se seedha baat karo — botsaathi.com"
    };
  }
};

module.exports = { processPersonalMessage };