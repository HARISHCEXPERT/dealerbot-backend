const axios = require("axios");
const Client = require("../models/Client");

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const BACKEND_URL = process.env.BACKEND_URL;

const metaCallback = async (req, res) => {
  const { code, state: clientId } = req.query;
  if (!code || !clientId) return res.status(400).json({ error: "code and clientId required" });

  try {
    const tokenRes = await axios.get("https://graph.facebook.com/v19.0/oauth/access_token", {
      params: { client_id: APP_ID, client_secret: APP_SECRET, code, redirect_uri: `${BACKEND_URL}/api/auth/meta/callback` }
    });
    const accessToken = tokenRes.data.access_token;

    const debugRes = await axios.get("https://graph.facebook.com/v19.0/debug_token", {
      params: { input_token: accessToken, access_token: `${APP_ID}|${APP_SECRET}` }
    });

    const scopes = debugRes.data?.data?.granular_scopes || [];
    const wabaScope = scopes.find(s => s.scope === "whatsapp_business_management");
    const wabaId = wabaScope?.target_ids?.[0];
    if (!wabaId) return res.status(400).json({ error: "WhatsApp Business Account not found" });

    const phoneRes = await axios.get(`https://graph.facebook.com/v19.0/${wabaId}/phone_numbers`, {
      params: { fields: "id,display_phone_number,verified_name" },
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const phoneId = phoneRes.data?.data?.[0]?.id;

    try {
      await axios.post(`https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { subscribed_fields: "messages" }
      });
    } catch (subErr) {
      console.error("Webhook subscribe error:", subErr?.response?.data || subErr.message);
    }

    const updatedClient = await Client.findByIdAndUpdate(clientId, {
      whatsapp: { metaAccessToken: accessToken, wabaId, phoneId: phoneId || "PENDING" },
      isActive: true
    });
    if (!updatedClient) return res.status(404).json({ error: "Client not found" });

    res.redirect(`${process.env.FRONTEND_URL}/onboard-success?clientId=${clientId}`);
  } catch (err) {
    console.error("Meta callback error:", err?.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL}/onboard-error?clientId=${clientId}`);
  }
};

const getOnboardStatus = async (req, res) => {
  const { clientId } = req.params;
  try {
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ error: "Client not found" });

    const isOnboarded = !!(client.whatsapp?.wabaId && client.whatsapp?.phoneId && client.whatsapp?.phoneId !== "MOCK_PHONE_ID");
    res.json({ clientId: client._id, name: client.name, brand: client.brand, isOnboarded, wabaId: client.whatsapp?.wabaId || null, phoneId: client.whatsapp?.phoneId || null, isActive: client.isActive });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const getOnboardUrl = async (req, res) => {
  const { clientId } = req.params;
  try {
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ error: "Client not found" });

    const redirectUri = encodeURIComponent(`${BACKEND_URL}/api/auth/meta/callback`);
    const onboardUrl = `https://www.facebook.com/dialog/oauth?client_id=${APP_ID}&redirect_uri=${redirectUri}&scope=whatsapp_business_management,whatsapp_business_messaging&response_type=code&state=${clientId}`;
    res.json({ onboardUrl, clientId });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { metaCallback, getOnboardStatus, getOnboardUrl };