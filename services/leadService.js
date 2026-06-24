const Lead = require("../models/Lead");
const { scoreLead } = require("./leadScoring");
const { sendToSheet } = require("./googleSheetService");
const { sendTelegramAlert } = require("./telegramService");
const { sendLeadAlert } = require("./emailService");

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

  return lead;
};

module.exports = { saveLead };