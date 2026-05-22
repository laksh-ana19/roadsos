const express = require("express");

const router = express.Router();

const {
  createSOS,
  getAllEmergencies,
  updateEmergencyStatus,
  getEmergenciesByUser,
  getEmergencyResponseTime,
} = require("../controllers/sosController");

router.post("/", createSOS);

router.get("/", getAllEmergencies);

router.put("/:id/status", updateEmergencyStatus);

router.get("/user/:userId", getEmergenciesByUser);

router.get("/:id/responsetime", getEmergencyResponseTime);

module.exports = router;