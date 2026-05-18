const mongoose = require("mongoose");

const emergencyContactSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },

  name: {
    type: String,
    required: true,
  },

  phone: {
    type: String,
    required: true,
  },

  relationship: {
    type: String,
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "EmergencyContact",
  emergencyContactSchema
);