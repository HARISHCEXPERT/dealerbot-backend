const Product = require("../models/Product");

const getProducts = async (req, res) => {
  try {
    const { brand } = req.query;
    const filter = brand ? { brand } : {};
    const products = await Product.find(filter);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ message: "Product added", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getProducts, addProduct };
