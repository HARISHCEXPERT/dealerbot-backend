// Long-running server entry — use this for local dev, Render, Railway, Fly.io, etc.
// For Vercel, the entry is api/index.js
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
});
