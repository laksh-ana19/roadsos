const mongoose = require("mongoose");

const emergencySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },

  ambulanceLocation: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
    updatedAt: {
      type: Date,
    },
  },

  status: {
    type: String,
    enum: [
      "CREATED",
      "TRIGGERED",
      "DISPATCHED",
      "ACCEPTED",
      "ENROUTE",
      "REACHED_USER",
      "AT_HOSPITAL",
      "COMPLETED",
    ],
    default: "CREATED",
  },

  assignedAmbulanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ambulance",
    default: null,
  },

  assignedHospital: {
    name: { type: String, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
  },

  voiceTriggered: {
    type: Boolean,
    default: false,
  },

  offlineTriggered: {
    type: Boolean,
    default: false,
  },

  timestamps: {
    created: { type: Date, default: Date.now },
    triggered: { type: Date, default: null },
    dispatched: { type: Date, default: null },
    accepted: { type: Date, default: null },
    reachedUser: { type: Date, default: null },
    atHospital: { type: Date, default: null },
    completed: { type: Date, default: null },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

emergencySchema.index({ location: "2dsphere" });
emergencySchema.index({ ambulanceLocation: "2dsphere" });

module.exports = mongoose.model("Emergency", emergencySchema);