const express = require("express");
const router = express.Router();

const {
  addEmergencyContact,
  getEmergencyContacts,
  deleteEmergencyContact,
  updateEmergencyContact,
} = require("../controllers/contactController");

router.post("/", addEmergencyContact);
router.get("/:userId", getEmergencyContacts);
router.delete("/delete/:id", deleteEmergencyContact);
router.put("/update/:id", updateEmergencyContact);

module.exports = router;