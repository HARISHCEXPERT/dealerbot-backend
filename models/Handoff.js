// Handoff repository — when bot can't help, queue for human
const supabase = require("../lib/supabase");
const TABLE = "handoffs";

const fromRow = (r, populate) => {
  if (!r) return null;
  const out = {
    _id: r.id,
    id: r.id,
    clientId: r.client_id,
    phone: r.phone,
    name: r.name || "",
    reason: r.reason || "",
    status: r.status || "pending",
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
  if (populate && r.clients) {
    out.clientId = {
      _id: r.clients.id,
      id: r.clients.id,
      name: r.clients.name,
      brand: r.clients.brand
    };
  }
  return out;
};

const Handoff = {
  async create({ clientId, phone, name = "", reason = "" }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ client_id: clientId, phone, name, reason })
      .select()
      .single();
    if (error) throw error;
    return fromRow(data);
  },

  async findAll() {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*, clients ( id, name, brand )")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => fromRow(r, true));
  },

  async resolveById(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ status: "resolved" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return fromRow(data);
  },

  async deleteById(id) {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;
  }
};

module.exports = Handoff;
