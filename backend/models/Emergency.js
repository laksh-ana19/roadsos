const mongoose = require("mongoose");

const emergencySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },

  location: {
    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },
  },

  ambulanceLocation: {
    latitude: {
      type: Number,
    },

    longitude: {
      type: Number,
    },

    updatedAt: {
      type: Date,
    },
  },

  status: {
    type: String,
    enum: ["ACTIVE", "AMBULANCE_ASSIGNED", "COMPLETED"],
    default: "ACTIVE",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Emergency", emergencySchema);