const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Generic send — tumhara number ya client ka chat ID
const sendTelegramAlert = async (message, chatId) => {
  const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
    const data = await res.json();
    if (!data.ok) console.error("Telegram error:", data);
  } catch (err) {
    console.error("Telegram send failed:", err.message);
  }
};

// /start command handler — client ko unka Chat ID batao
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
        `📋 Copy this ID and paste it in your BotSaathi dashboard under <b>Telegram Chat ID</b> to start receiving lead alerts on this chat.`,
        chatId
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Telegram webhook error:", err.message);
    res.sendStatus(200);
  }
};

// Webhook set karne ka helper — ek baar run karo
const setWebhook = async () => {
  const webhookUrl = `${process.env.BACKEND_URL}/api/telegram/webhook`;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${webhookUrl}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log("Telegram webhook set:", data);
};

module.exports = { sendTelegramAlert, handleTelegramWebhook, setWebhook };