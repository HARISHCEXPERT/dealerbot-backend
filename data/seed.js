// Seed Hero products into Supabase
// Run: node data/seed.js
require("dotenv").config({ path: __dirname + "/../.env" });
const Product = require("../models/Product");

const products = [
  {
    brand: "Hero",
    model: "Splendor Plus",
    priceRange: "₹74,000 – ₹79,000",
    variants: [
      { color: "Black with Purple", imageUrl: "https://www.heromotocorp.com/content/dam/hero-new/in/en/products/bikes/splendor-plus/overview/desktop-1.jpg" },
      { color: "Heavy Grey", imageUrl: "https://www.heromotocorp.com/content/dam/hero-new/in/en/products/bikes/splendor-plus/overview/desktop-2.jpg" },
      { color: "Red", imageUrl: "https://www.heromotocorp.com/content/dam/hero-new/in/en/products/bikes/splendor-plus/overview/desktop-3.jpg" }
    ]
  },
  {
    brand: "Hero",
    model: "HF Deluxe",
    priceRange: "₹64,000 – ₹70,000",
    variants: [
      { color: "Black with Red", imageUrl: "https://www.heromotocorp.com/content/dam/hero-new/in/en/products/bikes/hf-deluxe/overview/desktop-1.jpg" },
      { color: "Sports Red", imageUrl: "https://www.heromotocorp.com/content/dam/hero-new/in/en/products/bikes/hf-deluxe/overview/desktop-2.jpg" }
    ]
  },
  {
    brand: "Hero",
    model: "Passion Pro",
    priceRange: "₹79,000 – ₹85,000",
    variants: [
      { color: "Techno Blue", imageUrl: "https://www.heromotocorp.com/content/dam/hero-new/in/en/products/bikes/passion-pro/overview/desktop-1.jpg" },
      { color: "Candy Blazing Red", imageUrl: "https://www.heromotocorp.com/content/dam/hero-new/in/en/products/bikes/passion-pro/overview/desktop-2.jpg" },
      { color: "Pearl White", imageUrl: "https://www.heromotocorp.com/content/dam/hero-new/in/en/products/bikes/passion-pro/overview/desktop-3.jpg" }
    ]
  },
  {
    brand: "Hero",
    model: "Xtreme 160R",
    priceRange: "₹1,17,000 – ₹1,26,000",
    variants: [
      { color: "Matte Teal", imageUrl: "https://www.heromotocorp.com/content/dam/hero-new/in/en/products/bikes/xtreme-160r/overview/desktop-1.jpg" },
      { color: "Matte Red", imageUrl: "https://www.heromotocorp.com/content/dam/hero-new/in/en/products/bikes/xtreme-160r/overview/desktop-2.jpg" },
      { color: "Blazing Yellow", imageUrl: "https://www.heromotocorp.com/content/dam/hero-new/in/en/products/bikes/xtreme-160r/overview/desktop-3.jpg" }
    ]
  },
  {
    brand: "Hero",
    model: "Glamour",
    priceRange: "₹88,000 – ₹95,000",
    variants: [
      { color: "Candy Blazing Red", imageUrl: "https://www.heromotocorp.com/content/dam/hero-new/in/en/products/bikes/glamour/overview/desktop-1.jpg" },
      { color: "Sports Blue", imageUrl: "https://www.heromotocorp.com/content/dam/hero-new/in/en/products/bikes/glamour/overview/desktop-2.jpg" }
    ]
  }
];

(async function seed() {
  try {
    console.log("🗑️  Deleting old products...");
    await Product.deleteMany();
    console.log("🌱 Inserting new products...");
    const inserted = await Product.insertMany(products);
    console.log(`✅ ${inserted.length} products seeded`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err.message);
    process.exit(1);
  }
})();
