const mongoose = require("mongoose");

const emergencyLogSchema = new mongoose.Schema({
  emergencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Emergency",
    required: true,
  },

  userId: {
    type: String,
    required: true,
  },

  ambulanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ambulance",
    default: null,
  },

  hospitalName: {
    type: String,
    default: "Unknown",
  },

  triggeredAt: {
    type: Date,
    required: true,
  },

  ambulanceAssignedAt: {
    type: Date,
    default: null,
  },

  ambulanceReachedUserAt: {
    type: Date,
    default: null,
  },

  hospitalReachedAt: {
    type: Date,
    default: null,
  },

  totalResponseTimeMinutes: {
    type: Number,
    default: null,
  },

  status: {
    type: String,
    enum: ["COMPLETED", "CANCELLED", "FAILED"],
    default: "COMPLETED",
  },

  voiceTriggered: {
    type: Boolean,
    default: false,
  },

  offlineTriggered: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("EmergencyLog", emergencyLogSchema);