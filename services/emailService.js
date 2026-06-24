// Email service — OTP + Lead alerts + Daily summary
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_USER) return null;
  try {
    const nodemailer = require("nodemailer");
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    return transporter;
  } catch (e) {
    console.error("Nodemailer init failed:", e.message);
    return null;
  }
};

// OTP email
const sendOtpEmail = async (to, otp) => {
  const t = getTransporter();
  if (!t) {
    console.log("\n========================================");
    console.log(`📧 OTP for ${to}:  ${otp}`);
    console.log("   (SMTP not configured — set SMTP_HOST/USER/PASS to actually email it)");
    console.log("========================================\n");
    return;
  }
  try {
    await t.sendMail({
      from: SMTP_FROM,
      to,
      subject: "BotSaathi — Password Reset OTP",
      text: `Your OTP is: ${otp}\n\nValid for 15 minutes.`,
      html: `
        <div style="font-family:sans-serif;padding:20px">
          <h2 style="color:#25d366">BotSaathi — Password Reset</h2>
          <p>Your OTP is:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:6px;background:#f4f4f4;padding:16px;border-radius:8px;text-align:center;margin:16px 0">${otp}</div>
          <p style="color:#666;font-size:13px">Valid for 15 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `
    });
    console.log(`📧 OTP emailed to ${to}`);
  } catch (e) {
    console.error("Email send failed:", e.message);
    console.log(`📧 OTP for ${to}:  ${otp}  (fallback log)`);
  }
};

// New lead alert
const sendLeadAlert = async (to, { clientName, phone, interest, score }) => {
  const emoji = score === "hot" ? "🔥" : score === "warm" ? "🌡️" : "❄️";
  const t = getTransporter();
  if (!t) {
    console.log(`📧 Lead alert for ${to}: ${emoji} ${phone} — ${interest} — ${score}`);
    return;
  }
  try {
    await t.sendMail({
      from: SMTP_FROM,
      to,
      subject: `${emoji} New Lead — ${clientName}`,
      html: `
        <div style="font-family:sans-serif;padding:20px;max-width:500px">
          <h2 style="color:#25d366">${emoji} New Lead</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:10px;color:#666;font-size:13px">Business</td>
              <td style="padding:10px;font-weight:600;font-size:13px">${clientName}</td>
            </tr>
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:10px;color:#666;font-size:13px">Phone</td>
              <td style="padding:10px;font-weight:600;font-size:13px">${phone}</td>
            </tr>
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:10px;color:#666;font-size:13px">Interest</td>
              <td style="padding:10px;font-weight:600;font-size:13px">${interest}</td>
            </tr>
            <tr>
              <td style="padding:10px;color:#666;font-size:13px">Score</td>
              <td style="padding:10px;font-weight:700;font-size:13px">${emoji} ${score.toUpperCase()}</td>
            </tr>
          </table>
          <p style="color:#999;font-size:11px;margin-top:20px">BotSaathi — WhatsApp Automation Platform</p>
        </div>
      `
    });
    console.log(`📧 Lead alert emailed to ${to}`);
  } catch (e) {
    console.error("Lead alert email failed:", e.message);
  }
};

// Daily summary email
const sendDailySummaryEmail = async (to, { clientName, date, total, hot, warm, cold }) => {
  const t = getTransporter();
  if (!t) {
    console.log(`📧 Daily summary for ${to}: ${total} leads (${hot} hot, ${warm} warm, ${cold} cold)`);
    return;
  }
  try {
    await t.sendMail({
      from: SMTP_FROM,
      to,
      subject: `📊 Daily Summary — ${clientName} — ${date}`,
      html: `
        <div style="font-family:sans-serif;padding:20px;max-width:500px">
          <h2 style="color:#25d366">📊 Daily Lead Summary</h2>
          <p style="color:#666">${clientName} · ${date}</p>
          <div style="display:flex;gap:16px;margin:20px 0;flex-wrap:wrap">
            <div style="background:#f9f9f9;border-radius:8px;padding:16px;text-align:center;min-width:80px">
              <div style="font-size:28px;font-weight:700;color:#333">${total}</div>
              <div style="font-size:12px;color:#666">Total</div>
            </div>
            <div style="background:#fff3f3;border-radius:8px;padding:16px;text-align:center;min-width:80px">
              <div style="font-size:28px;font-weight:700;color:#ff4444">${hot}</div>
              <div style="font-size:12px;color:#666">🔥 Hot</div>
            </div>
            <div style="background:#fff8f0;border-radius:8px;padding:16px;text-align:center;min-width:80px">
              <div style="font-size:28px;font-weight:700;color:#ff9500">${warm}</div>
              <div style="font-size:12px;color:#666">🌡️ Warm</div>
            </div>
            <div style="background:#f0f8ff;border-radius:8px;padding:16px;text-align:center;min-width:80px">
              <div style="font-size:28px;font-weight:700;color:#4d9fff">${cold}</div>
              <div style="font-size:12px;color:#666">❄️ Cold</div>
            </div>
          </div>
          <p style="color:#999;font-size:11px">BotSaathi — WhatsApp Automation Platform</p>
        </div>
      `
    });
    console.log(`📧 Daily summary emailed to ${to}`);
  } catch (e) {
    console.error("Daily summary email failed:", e.message);
  }
};

module.exports = { sendOtpEmail, sendLeadAlert, sendDailySummaryEmail };