// Session repository — bot conversation memory
const supabase = require("../lib/supabase");

const TABLE = "sessions";

const fromRow = (r) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    clientId: r.client_id,
    phone: r.phone,
    step: r.step || "greeting",
    data: r.data || {},
    messages: r.messages || [],
    updatedAt: r.updated_at,
    // mongoose-style .save() helper
    async save() {
      return Session.upsert({
        clientId: this.clientId,
        phone: this.phone,
        step: this.step,
        data: this.data,
        messages: this.messages
      });
    }
  };
};

const Session = {
  fromRow,

  async findOne({ clientId, phone }) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("client_id", String(clientId))
      .eq("phone", String(phone))
      .maybeSingle();
    if (error && error.code !== "PGRST116") throw error;
    return fromRow(data);
  },

  /** Create-or-update on (client_id, phone) unique key */
  async upsert({ clientId, phone, step, data, messages }) {
    const row = {
      client_id: String(clientId),
      phone: String(phone),
      step: step || "greeting",
      data: data || {},
      messages: messages || [],
      updated_at: new Date().toISOString()
    };
    const { data: saved, error } = await supabase
      .from(TABLE)
      .upsert(row, { onConflict: "client_id,phone" })
      .select()
      .single();
    if (error) throw error;
    return fromRow(saved);
  },

  async findOneAndDelete({ clientId, phone }) {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("client_id", String(clientId))
      .eq("phone", String(phone));
    if (error) throw error;
    return true;
  },

  /**
   * Convenience helper used by bot engines: returns an in-memory session
   * (does NOT auto-create a row). Caller calls .save() to persist.
   */
  build({ clientId, phone, step = "greeting", data = {}, messages = [] }) {
    return fromRow({
      id: null,
      client_id: String(clientId),
      phone: String(phone),
      step,
      data,
      messages,
      updated_at: new Date().toISOString()
    });
  }
};

module.exports = Session;
