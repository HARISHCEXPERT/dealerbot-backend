// Lead repository
const supabase = require("../lib/supabase");

const TABLE = "leads";

const fromRow = (r, clientRel) => {
  if (!r) return null;
  const out = {
    _id: r.id,
    id: r.id,
    clientId: r.client_id,
    phone: r.phone,
    name: r.name || "",
    interest: r.interest || "Unknown",
    model: r.model || "",
    score: r.score || "cold",
    status: r.status || "New",
    notes: r.notes || "",
    followUpDate: r.follow_up_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
  if (clientRel && r.clients) {
    out.clientId = {
      _id: r.clients.id,
      id: r.clients.id,
      name: r.clients.name,
      brand: r.clients.brand
    };
  }
  return out;
};

const toRow = (d = {}) => {
  const row = {};
  if (d.clientId !== undefined) row.client_id = d.clientId;
  if (d.phone !== undefined) row.phone = d.phone;
  if (d.name !== undefined) row.name = d.name;
  if (d.interest !== undefined) row.interest = d.interest;
  if (d.model !== undefined) row.model = d.model;
  if (d.score !== undefined) row.score = d.score;
  if (d.status !== undefined) row.status = d.status;
  if (d.notes !== undefined) row.notes = d.notes;
  if (d.followUpDate !== undefined) row.follow_up_date = d.followUpDate || null;
  return row;
};

const Lead = {
  async create(data) {
    const { data: row, error } = await supabase.from(TABLE).insert(toRow(data)).select().single();
    if (error) throw error;
    return fromRow(row);
  },

  async find(filter = {}, opts = {}) {
    const cols = opts.populate ? "*, clients ( id, name, brand )" : "*";
    let q = supabase.from(TABLE).select(cols);
    if (filter.clientId) q = q.eq("client_id", filter.clientId);
    if (filter.score) q = q.eq("score", filter.score);
    if (filter.interest) q = q.eq("interest", filter.interest);
    if (filter.status) q = q.eq("status", filter.status);
    if (filter.since) q = q.gte("created_at", filter.since);
    q = q.order("created_at", { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((r) => fromRow(r, opts.populate));
  },

  async findById(id) {
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return fromRow(data);
  },

  async findByIdAndUpdate(id, patch) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(toRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return fromRow(data);
  },

  async findOneAndUpdateUpsert({ clientId, phone }, patch) {
    const { data: updated, error: upErr } = await supabase
      .from(TABLE)
      .update(toRow(patch))
      .eq("client_id", clientId)
      .eq("phone", phone)
      .select()
      .maybeSingle();
    if (upErr && upErr.code !== "PGRST116") throw upErr;
    if (updated) return fromRow(updated);

    const { data: inserted, error: insErr } = await supabase
      .from(TABLE)
      .insert(toRow({ ...patch, clientId, phone }))
      .select()
      .single();
    if (insErr) throw insErr;
    return fromRow(inserted);
  },

  async findByIdAndDelete(id) {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  async count(filter = {}) {
    let q = supabase.from(TABLE).select("*", { count: "exact", head: true });
    if (filter.score) q = q.eq("score", filter.score);
    if (filter.interest) q = q.eq("interest", filter.interest);
    if (filter.status) q = q.eq("status", filter.status);
    if (filter.clientId) q = q.eq("client_id", filter.clientId);
    if (filter.since) q = q.gte("created_at", filter.since);
    const { count, error } = await q;
    if (error) throw error;
    return count || 0;
  },

  /** Return rows since a date for daily aggregation */
  async findSince(sinceISO, extraFilter = {}) {
    let q = supabase.from(TABLE).select("id, created_at, score, status, interest, client_id");
    q = q.gte("created_at", sinceISO);
    if (extraFilter.clientId) q = q.eq("client_id", extraFilter.clientId);
    q = q.order("created_at", { ascending: true });
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }
};

module.exports = Lead;
