require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const leadRoutes = require("./routes/leadRoutes");
const productRoutes = require("./routes/productRoutes");
const handoffRoutes = require("./routes/handoffRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");


const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "*";
app.use(
  cors({
    origin: FRONTEND_URL === "*" ? true : FRONTEND_URL.split(",").map((s) => s.trim()),
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

// ---- Meta WhatsApp webhook verification ----
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "token123";

// Both /webhook and /api/webhook GET — verify karo
app.get(["/webhook", "/api/webhook"], (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ---- API routes ----
app.use("/api", authRoutes);
app.use("/api", clientRoutes);
app.use("/api", webhookRoutes);
app.use("/api", leadRoutes);
app.use("/api", productRoutes);
app.use("/api", handoffRoutes);
app.use("/api", conversationRoutes);
app.use("/api", paymentRoutes);


// ---- Health ----
app.get("/", (req, res) => {
  res.json({
    status: "BotSaathi API running 🚀",
    db: "supabase",
    version: "2.0.0"
  });
});
app.get("/api/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

// ---- 404 ----
app.use((req, res) => res.status(404).json({ error: "Route not found", path: req.path }));

module.exports = app;