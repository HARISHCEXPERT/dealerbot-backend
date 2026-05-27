const Handoff = require("../models/Handoff");

// GET /api/handoffs
const listHandoffs = async (req, res) => {
  try {
    const handoffs = await Handoff.findAll();
    res.json(handoffs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/handoff — bot creates one
const createHandoff = async (req, res) => {
  try {
    const { clientId, phone, name, reason } = req.body;
    if (!clientId || !phone) return res.status(400).json({ error: "clientId aur phone chahiye" });
    const handoff = await Handoff.create({ clientId, phone, name, reason });
    res.status(201).json({ message: "Handoff created", handoff });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/handoff/:id/resolve
const resolveHandoff = async (req, res) => {
  try {
    const handoff = await Handoff.resolveById(req.params.id);
    res.json({ message: "Resolved", handoff });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// DELETE /api/handoff/:id
const deleteHandoff = async (req, res) => {
  try {
    await Handoff.deleteById(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { listHandoffs, createHandoff, resolveHandoff, deleteHandoff };
