// User repository (dashboard users — admin/client)
const supabase = require("../lib/supabase");
const TABLE = "users";

const fromRow = (r) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    email: r.email,
    role: r.role,
    clientId: r.client_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at
    // password_hash / otp deliberately NOT exposed
  };
};

const User = {
  fromRow,

  async create({ email, passwordHash, role = "client", clientId = null }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ email, password_hash: passwordHash, role, client_id: clientId })
      .select()
      .single();
    if (error) throw error;
    return fromRow(data);
  },

  async findById(id) {
    if (!id) return null;
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return fromRow(data);
  },

  async findByEmail(email) {
    if (!email) return null;
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
    if (error) throw error;
    return data; // raw — caller needs password_hash
  },

  async findAll() {
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, email, role, client_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(fromRow);
  },

  async updatePassword(id, passwordHash) {
    const { error } = await supabase
      .from(TABLE)
      .update({ password_hash: passwordHash, otp: null, otp_expires_at: null })
      .eq("id", id);
    if (error) throw error;
  },

  async setOtp(id, otp, expiresAt) {
    const { error } = await supabase
      .from(TABLE)
      .update({ otp, otp_expires_at: expiresAt })
      .eq("id", id);
    if (error) throw error;
  },

  async clearOtp(id) {
    const { error } = await supabase
      .from(TABLE)
      .update({ otp: null, otp_expires_at: null })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteById(id) {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;
  }
};

module.exports = User;
