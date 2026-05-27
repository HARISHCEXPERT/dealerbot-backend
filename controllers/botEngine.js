const { GoogleGenerativeAI } = require("@google/generative-ai");
const Session = require("../models/Session");
const { sendToSheet } = require("../services/googleSheetService");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const buildSystemPrompt = (client) => `
Tu ${client.name} ka official WhatsApp AI assistant hai.

SHOWROOM DETAILS:
- Brand: ${client.brand}
- City: ${client.city}
- Address: ${client.botProfile?.address || "Showroom pe aayein"}
- Contact: ${client.botProfile?.phone || "Dealer se contact karein"}
- Timings: ${client.botProfile?.hours || "Mon-Sat 9AM-6PM"}

CURRENT OFFERS:
${client.botProfile?.offers || "Latest offers ke liye showroom contact karein"}

EXTRA INFO:
${client.botProfile?.extraInfo || ""}

TERA KAAM:
- Hinglish mein baat kar — friendly aur professional
- WhatsApp pe chhote replies do (3-4 lines max)
- Bike details, pricing, test ride, service booking help karo
- Hamesha lead lene ki koshish karo — naam aur number
- Agar koi ready lage toh showroom visit ya callback suggest karo

LEAD EXTRACTION — ZAROORI:
Apni normal reply ke baad HAMESHA yeh JSON likho:
LEADDATA:{"name":"","phone":"","interest":"","score":""}

- name: user ne bataya ho tabhi
- phone: 10 digit mile tabhi
- interest: "Bike Details" / "Service Booking" / "Test Ride" / "Price Inquiry" / "General"
- score: "hot" / "warm" / "cold"

Example:
Namaste! Splendor Plus ₹74,000 se shuru hoti hai... 😊

LEADDATA:{"name":"","phone":"","interest":"Price Inquiry","score":"warm"}
`;

const processMessage = async (clientId, phone, message, client) => {
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const history = session.data.history || [];

    const chat = model.startChat({
      history,
      systemInstruction: buildSystemPrompt(client)
    });

    const result = await chat.sendMessage(message);
    const fullResponse = result.response.text();

    // Reply aur Lead alag karo
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
    history.push({ role: "user", parts: [{ text: message }] });
    history.push({ role: "model", parts: [{ text: fullResponse }] });
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
        leadData.score === "hot" ||
        leadData.score === "warm";

      if (shouldSave) {
        sendToSheet(client.googleSheetUrl, {
          phone,
          name: session.data.name || "",
          interest: session.data.interest || "General",
          message,
          score: session.data.score || "cold"
        });
      }
    }

    await session.save();
    return { reply };
  } catch (err) {
    console.error("Gemini error:", err.message);
    return {
      reply:
        "Thoda technical issue aa gaya 😅 Please thodi der baad try karein ya showroom contact karein."
    };
  }
};

const resetConversation = async (clientId, phone) => {
  await Session.findOneAndDelete({ clientId, phone });
};

module.exports = { processMessage, resetConversation };
