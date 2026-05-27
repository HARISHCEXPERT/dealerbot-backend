const router = require("express").Router();
const { getProducts, addProduct } = require("../controllers/productController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.get("/products", requireAuth, getProducts);
router.post("/product", requireAuth, requireAdmin, addProduct);

module.exports = router;
