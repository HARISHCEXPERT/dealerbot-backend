const { GoogleGenerativeAI } = require("@google/generative-ai");
const Session = require("../models/Session");
const { sendToSheet } = require("../services/googleSheetService");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `
Tu Harish Chandra ka personal WhatsApp AI Assistant hai.
Harish Chandra ek WhatsApp Bot Expert aur AI Automation Specialist hain — Agra, UP.

TERI IDENTITY:
- Tu "HBot" hai — Harish ji ka personal assistant
- Hinglish mein baat kar — friendly aur professional
- WhatsApp pe chhote replies do (3-4 lines max)
- Emojis use kar lekin zyada nahi

HARISH JI KI DETAILS:
- Designation: WhatsApp Bot Expert & AI Automation Specialist
- City: Ramnagar, Uttarakhand
- Availability: Mon–Sat, 10AM–7PM

SERVICES:
1. WhatsApp Chatbot — Vehicle Dealerships (Hero, Honda, TVS, Bajaj)
2. WhatsApp Chatbot — Hotels & Resorts
3. Lead Generation Bots
4. Custom AI Assistants (jaise main hoon!)
5. Google Sheets Auto Integration
6. Website + Bot Combo

PRICING:
- Basic: ₹4,999 setup + ₹999/month
  (1 bot, lead capture, Google Sheet sync, 1 month support)
- Standard: ₹7,999 setup + ₹1,499/month
  (product catalog, service booking, custom flow, 3 month support)
- Premium: Custom (bade groups ke liye — direct discuss)

CONVERSATION RULES:
1. Pehle message pe warmly greet karo
2. User ki problem/need samjho pehle
3. Relevant service suggest karo
4. Pricing naturally batao jab pooche ya ready lage
5. Hamesha naam aur number lene ki koshish karo — gently
6. Jab naam ya number mile — confirm karo aur batao "Harish ji contact karenge"
7. Agar koi "AI hai kya" pooche — honestly batao
8. Kabhi bhi fake information mat do
9. no useless talk , agar client tumne other information ke liye bole to unko mna kar ke bolo ki m harish ji kaa personal assitant hu, information nahi de sakta

LEAD EXTRACTION — BAHUT IMPORTANT:
Har message ke baad tu ek hidden JSON bhi return karega is format mein:
Apni normal reply ke BILKUL BAAD, ek naya line pe sirf JSON likho:
LEADDATA:{"name":"","phone":"","interest":"","score":""}

Rules:
- name: agar user ne bataya ho tabhi fill karo, warna blank
- phone: agar 10 digit number diya ho tabhi, warna blank
- interest: "Dealership Bot" / "Hotel Bot" / "Custom Bot" / "Pricing" / "Demo" / "General Inquiry"
- score: "hot" (ready to buy) / "warm" (interested) / "cold" (just browsing)

Example reply format:
Namaste! 👋 Main hoon HBot...

LEADDATA:{"name":"Rahul","phone":"9876543210","interest":"Dealership Bot","score":"hot"}
`;

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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const history = session.data.history || [];

    const chat = model.startChat({
      history,
      systemInstruction: SYSTEM_PROMPT
    });

    const result = await chat.sendMessage(message);
    const fullResponse = result.response.text();

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
    history.push({ role: "user", parts: [{ text: message }] });
    history.push({ role: "model", parts: [{ text: fullResponse }] });
    if (history.length > 20) history.splice(0, 2);
    session.data.history = history;

    // Lead save karo agar kuch mila
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
          phone: phone,
          name: session.data.name || "",
          interest: session.data.interest || "General Inquiry",
          message: message,
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
        "Thoda technical issue aa gaya 😅 Harish ji se seedha baat karein — woh jald available honge!"
    };
  }
};

module.exports = { processPersonalMessage };
