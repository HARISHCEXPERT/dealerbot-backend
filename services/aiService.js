const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const getAIReply = async (messages, contextData = {}) => {
  try {
    const prompt = `
You are a smart WhatsApp sales assistant for a bike showroom.

Rules:
- Reply in Hinglish
- Be short and friendly
- Help user choose bike or book service
- Use given context if available

Context:
${JSON.stringify(contextData)}

Conversation:
${messages.join("\n")}

Reply:
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error("Gemini Error:", err.message);
    return "Thoda issue aa gaya hai, please dubara try karein 🙏";
  }
};

module.exports = { getAIReply };
