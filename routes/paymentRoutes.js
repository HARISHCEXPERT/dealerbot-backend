const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  createOrder,
  verifyPayment
} = require("../controllers/paymentController");

router.post("/payment/create-order", requireAuth, createOrder);
router.post("/payment/verify", requireAuth, verifyPayment);

module.exports = router;