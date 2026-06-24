const Razorpay = require("razorpay");
const crypto = require("crypto");
const Client = require("../models/Client");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLANS = {
  basic:    { amount: 199900, name: "Basic Plan",    months: 1 },
  standard: { amount: 249900, name: "Standard Plan", months: 1 },
  premium:  { amount: 499900, name: "Premium Plan",  months: 1 },
};

const createOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    const planInfo = PLANS[plan];
    if (!planInfo) return res.status(400).json({ error: "Invalid plan" });

    const order = await razorpay.orders.create({
      amount: planInfo.amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { plan, clientId: req.user.clientId }
    });

    res.json({ orderId: order.id, amount: planInfo.amount, currency: "INR", plan, name: planInfo.name });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const planInfo = PLANS[plan];
    const planEndDate = new Date();
    planEndDate.setMonth(planEndDate.getMonth() + planInfo.months);

    await Client.findByIdAndUpdate(req.user.clientId, {
      plan_end_date: planEndDate.toISOString(),
      is_active: true
    });

    res.json({ success: true, message: "Payment verified", planEndDate });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
};

module.exports = { createOrder, verifyPayment };