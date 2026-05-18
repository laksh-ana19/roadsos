const express = require("express");

const router = express.Router();

const {
  addEmergencyContact,
  getEmergencyContacts,
} = require(
  "../controllers/contactController"
);

router.post("/", addEmergencyContact);

router.get("/:userId", getEmergencyContacts);

module.exports = router;