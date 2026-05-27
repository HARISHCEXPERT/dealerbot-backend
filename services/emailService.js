// Email service — sends OTP for password reset.
// If SMTP_* vars are missing, just logs to console (dev mode).
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

const sendOtpEmail = async (to, otp) => {
  const t = getTransporter();
  if (!t) {
    // Dev mode — just log
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
      text: `Aapka OTP hai: ${otp}\n\nYe 15 minute ke liye valid hai.`,
      html: `
        <div style="font-family:sans-serif;padding:20px">
          <h2 style="color:#25d366">BotSaathi — Password Reset</h2>
          <p>Aapka OTP hai:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:6px;background:#f4f4f4;padding:16px;border-radius:8px;text-align:center;margin:16px 0">${otp}</div>
          <p style="color:#666;font-size:13px">Ye OTP 15 minute ke liye valid hai. Agar aapne reset request nahi kiya toh is email ko ignore karein.</p>
        </div>
      `
    });
    console.log(`📧 OTP emailed to ${to}`);
  } catch (e) {
    console.error("Email send failed:", e.message);
    console.log(`📧 OTP for ${to}:  ${otp}  (fallback log)`);
  }
};

module.exports = { sendOtpEmail };
