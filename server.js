const fetch = require("node-fetch");
const app = require("./app");
const startExpiryJob = require("./jobs/expiryJob");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 BotSaathi backend on port ${PORT}`);
  console.log(`🗄️  Supabase: ${process.env.SUPABASE_URL || "NOT SET"}`);
  try {
    startExpiryJob();
    console.log("⏰ Expiry cron scheduled");
  } catch (e) {
    console.error("Cron failed:", e.message);
  }

  // Keep alive — Render free tier ko jagte rakho
  if (process.env.BACKEND_URL) {
    setInterval(() => {
      fetch(`${process.env.BACKEND_URL}/api/health`)
        .then(() => console.log("🏓 Keep alive"))
        .catch(() => {});
    }, 10 * 60 * 1000);
    console.log("🏓 Keep alive started");
  }
});