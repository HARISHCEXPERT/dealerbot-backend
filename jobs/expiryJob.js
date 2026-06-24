const cron = require("node-cron");
const Client = require("../models/Client");
const Lead = require("../models/Lead");
const { sendTelegramAlert } = require("../services/telegramService");
const { sendDailySummaryEmail } = require("../services/emailService");

module.exports = () => {
  // Expiry check — roz midnight
  cron.schedule("0 0 * * *", async () => {
    try {
      const count = await Client.deactivateExpired(new Date());
      console.log(`Expiry job: ${count} clients deactivated`);
    } catch (e) {
      console.error("Expiry job error:", e.message);
    }
  });

  // Daily summary — raat 12 baje
  cron.schedule("0 0 * * *", async () => {
    try {
      const clients = await Client.findAllActive();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateStr = today.toLocaleDateString("en-IN");

      for (const client of clients) {
        const leads = await Lead.findTodayByClient(client._id || client.id, today);
        if (!leads || !leads.length) continue;

        const hot = leads.filter(l => l.score === "hot").length;
        const warm = leads.filter(l => l.score === "warm").length;
        const cold = leads.filter(l => l.score === "cold").length;
        const total = leads.length;

        // Telegram summary
        const chatId = client.notifications?.telegram?.chatId || null;
        if (chatId) {
          await sendTelegramAlert(
            `📊 <b>Daily Summary — ${client.name}</b>\n` +
            `📅 ${dateStr}\n\n` +
            `👥 Total Leads: <b>${total}</b>\n` +
            `🔥 Hot: ${hot} | 🌡 Warm: ${warm} | ❄️ Cold: ${cold}`,
            chatId
          );
        }

        // Email summary
        const emailTo = client.notifications?.email || null;
        if (emailTo) {
          await sendDailySummaryEmail(emailTo, {
            clientName: client.name,
            date: dateStr,
            total,
            hot,
            warm,
            cold
          });
        }
      }
      console.log("✅ Daily summary sent");
    } catch (e) {
      console.error("Daily summary error:", e.message);
    }
  });
};