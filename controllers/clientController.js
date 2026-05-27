const Client = require("../models/Client");

const addClient = async (req, res) => {
  try {
    const { name, brand, city, whatsappPhoneId, whatsappToken, googleSheetUrl, planEndDate, overrideActive } = req.body;
    if (!name || !brand) return res.status(400).json({ error: "Name and brand required." });

    const client = await Client.create({
      name,
      brand,
      city: city || "",
      whatsapp: {
        phoneId: whatsappPhoneId || "MOCK_PHONE_ID",
        token: whatsappToken || "MOCK_TOKEN"
      },
      googleSheetUrl: googleSheetUrl || "",
      planEndDate: planEndDate || null,
      overrideActive: overrideActive !== undefined ? overrideActive : true
    });

    res.status(201).json({ message: "Client added", client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getClients = async (req, res) => {
  try {
    const clients = await Client.find();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: "Not found" });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body);
    if (!client) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Updated", client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteClient = async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { addClient, getClients, getClientById, updateClient, deleteClient };
