const axios = require("axios");
const Client = require("../models/Client");

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const BACKEND_URL = process.env.BACKEND_URL;

// ✅ Step 1: Meta callback
const metaCallback = async (req, res) => {
  const { code, state: clientId } = req.query; // state se clientId lo

  if (!code || !clientId) {
    return res.status(400).json({ error: "code aur clientId dono chahiye" });
  }

  try {
    const tokenRes = await axios.get("https://graph.facebook.com/v19.0/oauth/access_token", {
      params: {
        client_id: APP_ID,
        client_secret: APP_SECRET,
        code: code,
        redirect_uri: `${BACKEND_URL}/api/auth/meta/callback` // clean URL — no query params
      }
    });

    const accessToken = tokenRes.data.access_token;

    const wabaRes = await axios.get("https://graph.facebook.com/v19.0/me/whatsapp_business_accounts", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const wabaId = wabaRes.data?.data?.[0]?.id;

    if (!wabaId) {
      return res.status(400).json({ error: "WhatsApp Business Account nahi mila" });
    }

    const phoneRes = await axios.get(`https://graph.facebook.com/v19.0/${wabaId}/phone_numbers`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const phoneId = phoneRes.data?.data?.[0]?.id;

    const updatedClient = await Client.findByIdAndUpdate(clientId, {
      whatsapp: {
        metaAccessToken: accessToken,
        wabaId: wabaId,
        phoneId: phoneId || "PENDING"
      },
      isActive: true
    });

    if (!updatedClient) {
      return res.status(404).json({ error: "Client nahi mila database mein" });
    }

    res.redirect(`${process.env.FRONTEND_URL}/onboard-success?clientId=${clientId}`);
  } catch (err) {
    console.error("Meta callback error:", err?.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL}/onboard-error?clientId=${clientId}`);
  }
};

// ✅ Step 2: Status check
const getOnboardStatus = async (req, res) => {
  const { clientId } = req.params;

  try {
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ error: "Client nahi mila" });

    const isOnboarded = !!(
      client.whatsapp?.wabaId &&
      client.whatsapp?.phoneId &&
      client.whatsapp?.phoneId !== "MOCK_PHONE_ID"
    );

    res.json({
      clientId: client._id,
      name: client.name,
      brand: client.brand,
      isOnboarded,
      wabaId: client.whatsapp?.wabaId || null,
      phoneId: client.whatsapp?.phoneId || null,
      isActive: client.isActive
    });
  } catch (err) {
    console.error("Status check error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Step 3: Onboard URL — state mein clientId pass karo
const getOnboardUrl = async (req, res) => {
  const { clientId } = req.params;

  try {
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ error: "Client nahi mila" });

    const redirectUri = encodeURIComponent(`${BACKEND_URL}/api/auth/meta/callback`);

    const onboardUrl =
      `https://www.facebook.com/dialog/oauth?` +
      `client_id=${APP_ID}` +
      `&redirect_uri=${redirectUri}` +
      `&scope=whatsapp_business_management,whatsapp_business_messaging` +
      `&response_type=code` +
      `&state=${clientId}` +  // clientId state mein
      `&config_id=2152842675495716`;

    res.json({ onboardUrl, clientId });
  } catch (err) {
    console.error("Onboard URL error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { metaCallback, getOnboardStatus, getOnboardUrl };