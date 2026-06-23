const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken } = require("../middleware/auth");
const { sendOtpEmail } = require("../services/emailService");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email aur password chahiye" });

    const row = await User.findByEmail(email);
    if (!row) return res.status(401).json({ error: "Email ya password galat hai" });

    const ok = await bcrypt.compare(password, row.password_hash || "");
    if (!ok) return res.status(401).json({ error: "Email ya password galat hai" });

    const user = User.fromRow(row);
    const token = signToken(user);
    res.json({ user, token });
  } catch (e) {
    console.error("Login error:", e); // FULL stack trace
    res.status(500).json({ error: "Server error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email chahiye" });

    const row = await User.findByEmail(email);
    if (!row) return res.json({ message: "Agar account hai toh OTP bhej diya gaya" });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await User.setOtp(row.id, otp, expiresAt);
    await sendOtpEmail(row.email, otp);

    res.json({ message: "OTP bhej diya gaya" });
  } catch (e) {
    console.error("Forgot error:", e.message);
    res.status(500).json({ error: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP aur new password chahiye" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password kam se kam 6 character ka hona chahiye" });
    }

    const row = await User.findByEmail(email);
    if (!row) return res.status(400).json({ error: "Invalid OTP" });

    if (!row.otp || row.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
    if (!row.otp_expires_at || new Date(row.otp_expires_at) < new Date()) {
      return res.status(400).json({ error: "OTP expire ho gaya. Naya OTP request karein." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(row.id, hash);

    res.json({ message: "Password reset ho gaya" });
  } catch (e) {
    console.error("Reset error:", e.message);
    res.status(500).json({ error: "Server error" });
  }
};

const listUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { email, password, role, clientId } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email aur password chahiye" });
    if (password.length < 6) return res.status(400).json({ error: "Password kam se kam 6 character" });

    const existing = await User.findByEmail(email);
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      role: role === "admin" ? "admin" : "client",
      clientId: clientId || null
    });
    res.status(201).json({ message: "User created", user });
  } catch (e) {
    console.error("Create user error:", e.message);
    res.status(500).json({ error: e.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (req.user && req.user.id === req.params.id) {
      return res.status(400).json({ error: "Apna account khud delete nahi kar sakte" });
    }
    await User.deleteById(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const adminResetPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).json({ error: "userId aur newPassword chahiye" });
    if (newPassword.length < 6) return res.status(400).json({ error: "Min 6 chars" });

    const hash = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(userId, hash);
    res.json({ message: "Password reset ho gaya" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  login,
  forgotPassword,
  resetPassword,
  listUsers,
  createUser,
  deleteUser,
  adminResetPassword,
  me
};