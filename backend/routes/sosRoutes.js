const express = require("express");

const router = express.Router();

const {
  createSOS,
  getAllEmergencies,
  updateEmergencyStatus,
} = require("../controllers/sosController");

router.post("/", createSOS);

router.get("/", getAllEmergencies);

router.put("/:id/status", updateEmergencyStatus);

module.exports = router;