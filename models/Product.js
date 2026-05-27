// Product repository
const supabase = require("../lib/supabase");

const TABLE = "products";

const fromRow = (r) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    brand: r.brand,
    model: r.model,
    priceRange: r.price_range || "Contact dealer",
    variants: r.variants || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
};

const toRow = (d = {}) => {
  const row = {};
  if (d.brand !== undefined) row.brand = d.brand;
  if (d.model !== undefined) row.model = d.model;
  if (d.priceRange !== undefined) row.price_range = d.priceRange;
  if (d.variants !== undefined) row.variants = d.variants;
  return row;
};

const Product = {
  async create(data) {
    const { data: row, error } = await supabase
      .from(TABLE)
      .insert(toRow(data))
      .select()
      .single();
    if (error) throw error;
    return fromRow(row);
  },

  async insertMany(items) {
    const rows = items.map(toRow);
    const { data, error } = await supabase.from(TABLE).insert(rows).select();
    if (error) throw error;
    return (data || []).map(fromRow);
  },

  async find(filter = {}) {
    let q = supabase.from(TABLE).select("*");
    if (filter.brand) {
      // case-insensitive brand match
      q = q.ilike("brand", `%${filter.brand}%`);
    }
    q = q.order("created_at", { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(fromRow);
  },

  async deleteMany() {
    // Delete all rows (used by seed)
    const { error } = await supabase.from(TABLE).delete().not("id", "is", null);
    if (error) throw error;
    return true;
  }
};

module.exports = Product;
