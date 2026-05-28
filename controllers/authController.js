const axios = require("axios");
const Client = require("../models/Client");

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const BACKEND_URL = process.env.BACKEND_URL;

const metaCallback = async (req, res) => {
  const { code, state: clientId } = req.query;

  if (!code || !clientId) {
    return res.status(400).json({ error: "code aur clientId dono chahiye" });
  }

  try {
    // Token exchange
    const tokenRes = await axios.get("https://graph.facebook.com/v19.0/oauth/access_token", {
      params: {
        client_id: APP_ID,
        client_secret: APP_SECRET,
        code: code,
        redirect_uri: `${BACKEND_URL}/api/auth/meta/callback`
      }
    });

    const accessToken = tokenRes.data.access_token;

    // Debug token se WABA ID nikalo
    const debugRes = await axios.get(
      "https://graph.facebook.com/v19.0/debug_token",
      {
        params: {
          input_token: accessToken,
          access_token: `${APP_ID}|${APP_SECRET}`
        }
      }
    );

    console.log("Debug token data:", JSON.stringify(debugRes.data));

    const scopes = debugRes.data?.data?.granular_scopes || [];
    const wabaScope = scopes.find(s => s.scope === "whatsapp_business_management");
    const wabaId = wabaScope?.target_ids?.[0];

    if (!wabaId) {
      console.error("No WABA ID in scopes:", scopes);
      return res.status(400).json({ error: "WhatsApp Business Account nahi mila" });
    }

    // Phone number fetch karo
    const phoneRes = await axios.get(
      `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const phoneId = phoneRes.data?.data?.[0]?.id;

    // Client update karo
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

const getOnboardUrl = async (req, res) => {
  const { clientId } = req.params;

  try {
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ error: "Client nahi mila" });

    const redirectUri = encodeURIComponent(`${BACKEND_URL}/api/auth/meta/callback`);

    const onboardUrl = `https://www.facebook.com/dialog/oauth?client_id=${APP_ID}&redirect_uri=${redirectUri}&scope=whatsapp_business_management,whatsapp_business_messaging&response_type=code&state=${clientId}`;

    res.json({ onboardUrl, clientId });
  } catch (err) {
    console.error("Onboard URL error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};
module.exports = { metaCallback, getOnboardStatus, getOnboardUrl };