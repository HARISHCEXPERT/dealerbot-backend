const Lead = require("../models/Lead");
const { scoreLead } = require("./leadScoring");
const { sendToSheet } = require("./googleSheetService");
const { sendTelegramAlert } = require("./telegramService");

const saveLead = async (client, phone, interest, messages) => {
  const score = scoreLead(messages);

  const lead = await Lead.findOneAndUpdateUpsert(
    { clientId: client._id, phone },
    { interest, score }
  );

  sendToSheet(client.googleSheetUrl, { phone, interest, score });

  // Telegram alert — client ka chat ID use karo, fallback tumhara
  const telegramChatId = client.bot_profile?.telegramChatId || null;
  const emoji = score === "hot" ? "🔥" : score === "warm" ? "🌡" : "❄️";
  await sendTelegramAlert(
    `${emoji} <b>New Lead — ${client.name}</b>\n\n` +
    `📱 Phone: <code>${phone}</code>\n` +
    `🎯 Interest: ${interest}\n` +
    `📊 Score: ${score.toUpperCase()}`,
    telegramChatId
  );

  return lead;
};

module.exports = { saveLead };