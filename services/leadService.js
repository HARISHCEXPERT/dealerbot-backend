const Lead = require("../models/Lead");
const { scoreLead } = require("./leadScoring");
const { sendToSheet } = require("./googleSheetService");
const { sendTelegramAlert } = require("./telegramService");
const { sendLeadAlert } = require("./emailService");
const axios = require("axios");

const sendWhatsAppAlert = async (client, phone, interest, score) => {
  try {
    const notifyPhone = client.notifications?.whatsapp;
    if (!notifyPhone) return;

    const token = client.whatsapp?.metaAccessToken;
    const phoneNumberId = client.whatsapp?.phoneId;
    if (!token || !phoneNumberId) return;

    const emoji = score === "hot" ? "🔥" : score === "warm" ? "🌡️" : "❄️";
    const message =
      `${emoji} *New Lead — ${client.name}*\n\n` +
      `📱 Phone: ${phone}\n` +
      `🎯 Interest: ${interest}\n` +
      `📊 Score: ${score.toUpperCase()}`;

    await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: notifyPhone,
        type: "text",
        text: { body: message }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log(`📱 WhatsApp alert sent to ${notifyPhone}`);
  } catch (err) {
    console.error("WhatsApp alert failed:", err.message);
  }
};

const saveLead = async (client, phone, interest, messages) => {
  const score = scoreLead(messages);

  const lead = await Lead.findOneAndUpdateUpsert(
    { clientId: client._id, phone },
    { interest, score }
  );

  sendToSheet(client.googleSheetUrl, { phone, interest, score });

  const emoji = score === "hot" ? "🔥" : score === "warm" ? "🌡" : "❄️";

  // Telegram alert
  const telegramChatId = client.notifications?.telegram?.chatId || null;
  await sendTelegramAlert(
    `${emoji} <b>New Lead — ${client.name}</b>\n\n` +
    `📱 Phone: <code>${phone}</code>\n` +
    `🎯 Interest: ${interest}\n` +
    `📊 Score: ${score.toUpperCase()}`,
    telegramChatId
  );

  // Email alert
  const emailTo = client.notifications?.email || null;
  if (emailTo) {
    await sendLeadAlert(emailTo, {
      clientName: client.name,
      phone,
      interest,
      score
    });
  }

  // WhatsApp alert
  await sendWhatsAppAlert(client, phone, interest, score);

  return lead;
};

module.exports = { saveLead };