const mongoose = require("mongoose");

const ambulanceSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  driverName: {
    type: String,
    required: true,
    trim: true,
  },

  driverPhone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },

  isAvailable: {
    type: Boolean,
    default: true,
  },

  currentEmergencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Emergency",
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ambulanceSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Ambulance", ambulanceSchema);