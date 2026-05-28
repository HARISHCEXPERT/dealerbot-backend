const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const getAIReply = async (messages, contextData = {}) => {
  try {
    const systemPrompt = `You are a smart WhatsApp sales assistant for a vehicle dealership.

Rules:
- Reply in Hinglish (mix of Hindi and English)
- Be short, friendly and helpful — max 2-3 lines
- Help user choose bike, check price, book test ride or service
- Use given dealership context if available
- Never reveal you are an AI unless directly asked

Dealership Context:
${JSON.stringify(contextData)}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        { role: "user", content: messages.join("\n") }
      ]
    });

    return response.content[0].text;
  } catch (err) {
    console.error("Claude Error:", err.message);
    return "Thoda issue aa gaya hai, please dubara try karein 🙏";
  }
};

module.exports = { getAIReply };