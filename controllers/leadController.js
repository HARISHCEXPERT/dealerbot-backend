const Lead = require("../models/Lead");

const getLeads = async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = {};
    // Client-role users only see their own leads
    if (req.user && req.user.role === "client" && req.user.clientId) {
      filter.clientId = req.user.clientId;
    } else if (clientId) {
      filter.clientId = clientId;
    }
    const leads = await Lead.find(filter, { populate: true });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/leads/stats?clientId=...
const getLeadStats = async (req, res) => {
  try {
    let scopedClientId = req.query.clientId || null;
    if (req.user && req.user.role === "client" && req.user.clientId) {
      scopedClientId = req.user.clientId;
    }
    const base = scopedClientId ? { clientId: scopedClientId } : {};

    const [total, bikeLeads, serviceLeads, hot, warm, cold,
      newLeads, contacted, interested, closed, lost] = await Promise.all([
      Lead.count(base),
      Lead.count({ ...base, interest: "Bike Details" }),
      Lead.count({ ...base, interest: "Service Booking" }),
      Lead.count({ ...base, score: "hot" }),
      Lead.count({ ...base, score: "warm" }),
      Lead.count({ ...base, score: "cold" }),
      Lead.count({ ...base, status: "New" }),
      Lead.count({ ...base, status: "Contacted" }),
      Lead.count({ ...base, status: "Interested" }),
      Lead.count({ ...base, status: "Closed" }),
      Lead.count({ ...base, status: "Lost" })
    ]);

    // Daily (last 7 days)
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const recent = await Lead.findSince(since.toISOString(), base);

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), count: 0 });
    }
    recent.forEach((r) => {
      const k = new Date(r.created_at).toISOString().slice(0, 10);
      const day = days.find((d) => d.key === k);
      if (day) day.count += 1;
    });

    res.json({
      total,
      bikeLeads,
      serviceLeads,
      hot,
      warm,
      cold,
      status: { newLeads, contacted, interested, closed, lost },
      daily: days.map(({ date, count }) => ({ date, count }))
    });
  } catch (err) {
    console.error("Stats error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/lead/:id  — update status / notes / follow-up
const updateLead = async (req, res) => {
  try {
    const allowed = ["status", "notes", "followUpDate", "name", "interest", "score"];
    const patch = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    const lead = await Lead.findByIdAndUpdate(req.params.id, patch);
    if (!lead) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Updated", lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteLead = async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getLeads, getLeadStats, updateLead, deleteLead };
