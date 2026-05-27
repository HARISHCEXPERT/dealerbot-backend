const router = require("express").Router();
const {
  addClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient
} = require("../controllers/clientController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// All client mgmt is admin-only (except getClients which clients also use for dropdowns)
router.get("/clients", requireAuth, getClients);
router.post("/client", requireAuth, requireAdmin, addClient);
router.get("/client/:id", requireAuth, getClientById);
router.put("/client/:id", requireAuth, requireAdmin, updateClient);
router.delete("/client/:id", requireAuth, requireAdmin, deleteClient);

module.exports = router;
