const Lead = require("../models/Lead");
const { scoreLead } = require("./leadScoring");
const { sendToSheet } = require("./googleSheetService");

const saveLead = async (client, phone, interest, messages) => {
  const score = scoreLead(messages);

  const lead = await Lead.findOneAndUpdateUpsert(
    { clientId: client._id, phone },
    { interest, score }
  );

  sendToSheet(client.googleSheetUrl, { phone, interest, score });

  return lead;
};

module.exports = { saveLead };
