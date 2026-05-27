const cron = require("node-cron");
const Client = require("../models/Client");

module.exports = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      const count = await Client.deactivateExpired(new Date());
      console.log(`Expiry job: ${count} clients deactivated`);
    } catch (e) {
      console.error("Expiry job error:", e.message);
    }
  });
};
