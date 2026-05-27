const axios = require("axios");

const sendToSheet = async (url, data) => {
  if (!url) return;
  // fire and forget — lead save nahi rukegi sheet fail hone se
  axios.post(url, data).catch((e) => console.error("Sheet error:", e.message));
};

module.exports = { sendToSheet };
