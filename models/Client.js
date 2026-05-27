// Client repository — wraps Supabase calls in the same shape as the old Mongoose model.
// Output shape kept identical to old API (whatsapp.{phoneId,token,...}, botProfile.{...}, _id alias).
const supabase = require("../lib/supabase");

const TABLE = "clients";

// ---------- helpers ----------
// DB row -> API shape (nested whatsapp + botProfile, _id alias)
const fromRow = (r) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    name: r.name,
    brand: r.brand,
    city: r.city || "",
    whatsapp: {
      phoneId: r.whatsapp_phone_id || "MOCK_PHONE_ID",
      token: r.whatsapp_token || "MOCK_TOKEN",
      wabaId: r.whatsapp_waba_id || "",
      metaAccessToken: r.whatsapp_meta_access_token || ""
    },
    googleSheetUrl: r.google_sheet_url || "",
    planEndDate: r.plan_end_date,
    overrideActive: r.override_active,
    isActive: r.is_active,
    botProfile: r.bot_profile || {},
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
};

// API shape -> DB row (only fields that are present in input)
const toRow = (data = {}) => {
  const row = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.brand !== undefined) row.brand = data.brand;
  if (data.city !== undefined) row.city = data.city;
  if (data.googleSheetUrl !== undefined) row.google_sheet_url = data.googleSheetUrl;
  if (data.planEndDate !== undefined) row.plan_end_date = data.planEndDate;
  if (data.overrideActive !== undefined) row.override_active = data.overrideActive;
  if (data.isActive !== undefined) row.is_active = data.isActive;
  if (data.botProfile !== undefined) row.bot_profile = data.botProfile;

  // whatsapp nested OR dot-key
  if (data.whatsapp) {
    if (data.whatsapp.phoneId !== undefined) row.whatsapp_phone_id = data.whatsapp.phoneId;
    if (data.whatsapp.token !== undefined) row.whatsapp_token = data.whatsapp.token;
    if (data.whatsapp.wabaId !== undefined) row.whatsapp_waba_id = data.whatsapp.wabaId;
    if (data.whatsapp.metaAccessToken !== undefined) row.whatsapp_meta_access_token = data.whatsapp.metaAccessToken;
  }
  if (data["whatsapp.phoneId"] !== undefined) row.whatsapp_phone_id = data["whatsapp.phoneId"];
  if (data["whatsapp.token"] !== undefined) row.whatsapp_token = data["whatsapp.token"];
  if (data["whatsapp.wabaId"] !== undefined) row.whatsapp_waba_id = data["whatsapp.wabaId"];
  if (data["whatsapp.metaAccessToken"] !== undefined) row.whatsapp_meta_access_token = data["whatsapp.metaAccessToken"];

  return row;
};

// ---------- model methods ----------
const Client = {
  fromRow,
  toRow,

  async create(data) {
    const { data: row, error } = await supabase
      .from(TABLE)
      .insert(toRow(data))
      .select()
      .single();
    if (error) throw error;
    return fromRow(row);
  },

  async findById(id) {
    if (!id) return null;
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return fromRow(data);
  },

  async find(filter = {}) {
    let q = supabase.from(TABLE).select("*");
    if (filter.brand) q = q.eq("brand", filter.brand);
    if (filter.isActive !== undefined) q = q.eq("is_active", filter.isActive);
    q = q.order("created_at", { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(fromRow);
  },

  async findByIdAndUpdate(id, patch) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(toRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (error.code === "PGRST116") return null; // no rows
      throw error;
    }
    return fromRow(data);
  },

  async findByIdAndDelete(id) {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  /**
   * Bulk expire — used by the daily cron job.
   * Equivalent to:
   *   updateMany({ planEndDate: { $lt: now }, overrideActive: false }, { isActive: false })
   */
  async deactivateExpired(now = new Date()) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ is_active: false })
      .lt("plan_end_date", now.toISOString())
      .eq("override_active", false)
      .select("id");
    if (error) throw error;
    return data ? data.length : 0;
  }
};

module.exports = Client;
