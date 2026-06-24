const axios = require("axios");
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const sendTelegramAlert = async (message, chatId) => {
  const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: targetChatId,
      text: message,
      parse_mode: "HTML",
    });
  } catch (err) {
    console.error("Telegram send failed:", err.message);
  }
};

const handleTelegramWebhook = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text || "";

    if (text === "/start") {
      await sendTelegramAlert(
        `👋 <b>Welcome to BotSaathi Alerts!</b>\n\n` +
        `Your Telegram Chat ID is:\n\n<code>${chatId}</code>\n\n` +
        `📋 Copy this ID and paste it in your BotSaathi dashboard under <b>Telegram Chat ID</b> to start receiving lead alerts.`,
        chatId
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Telegram webhook error:", err.message);
    res.sendStatus(200);
  }
};

module.exports = { sendTelegramAlert, handleTelegramWebhook };