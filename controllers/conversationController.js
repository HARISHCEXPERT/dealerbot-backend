const supabase = require("../lib/supabase");

// GET /api/conversations?clientId=xxx
// GET /api/conversations/:phone?clientId=xxx
exports.getAllConversations = async (req, res) => {
  try {
    const { clientId } = req.query;
    if (!clientId) return res.status(400).json({ error: "clientId required" });

    const { data, error } = await supabase
      .from("sessions")
      .select("id, phone, step, messages, data, updated_at")
      .eq("client_id", String(clientId))
      .order("updated_at", { ascending: false });

    if (error) throw error;
    res.json({ conversations: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/conversations/:phone?clientId=xxx
exports.getConversationByPhone = async (req, res) => {
  try {
    const { clientId } = req.query;
    const { phone } = req.params;
    if (!clientId) return res.status(400).json({ error: "clientId required" });

    const { data, error } = await supabase
      .from("sessions")
      .select("id, phone, step, messages, data, updated_at")
      .eq("client_id", String(clientId))
      .eq("phone", String(phone))
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Conversation not found" });
    res.json({ conversation: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};