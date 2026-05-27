// MasterConfig repository
const supabase = require("../lib/supabase");

const TABLE = "master_config";

const MasterConfig = {
  async getOne() {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) return null;
    return {
      _id: data.id,
      id: data.id,
      aiApiKey: data.ai_api_key,
      agencyName: data.agency_name
    };
  },

  async upsert({ aiApiKey, agencyName }) {
    const existing = await this.getOne();
    if (existing) {
      const { data, error } = await supabase
        .from(TABLE)
        .update({ ai_api_key: aiApiKey, agency_name: agencyName })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return { _id: data.id, id: data.id, aiApiKey: data.ai_api_key, agencyName: data.agency_name };
    }
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ ai_api_key: aiApiKey, agency_name: agencyName })
      .select()
      .single();
    if (error) throw error;
    return { _id: data.id, id: data.id, aiApiKey: data.ai_api_key, agencyName: data.agency_name };
  }
};

module.exports = MasterConfig;
