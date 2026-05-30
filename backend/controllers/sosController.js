const Emergency = require("../models/Emergency");
const EmergencyContact = require("../models/EmergencyContact");
const sendSMS = require("../utils/sendSMS");

const createSOS = async (req, res) => {
  try {
    const { userId, latitude, longitude, voiceTriggered, keyword } = req.body;

    if (!userId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const emergency = await Emergency.create({
      userId,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      voiceTriggered: voiceTriggered || false,
      status: "CREATED",
    });

    console.log("Emergency Stored:", emergency);

    // =====================
    // SEND SMS TO CONTACTS
    // =====================
    try {
      const contacts = await EmergencyContact.find({
        userId: userId || "guest"
      });

      if (contacts.length > 0) {
        const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;

        const message =
          `🚨 SOS ALERT!\n` +
          `Need help!\n` +
          `📍 ${mapsLink}\n` +
          `Via RoadSoS`;

        for (const contact of contacts) {
          await sendSMS(contact.phone, message);
        }

        console.log(`✅ SMS sent to ${contacts.length} contact(s)`);

      } else {
        console.log("⚠️ No contacts found to send SMS");
      }

    } catch (smsError) {
      // SMS failure should NOT stop the SOS from being saved
      console.error("❌ SMS sending failed:", smsError.message);
    }

    res.status(201).json({
      success: true,
      message: "SOS triggered successfully",
      emergency,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getAllEmergencies = async (req, res) => {
  try {
    const emergencies = await Emergency.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: emergencies.length,
      emergencies,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const updateEmergencyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedEmergency = await Emergency.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedEmergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Emergency status updated",
      emergency: updatedEmergency,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getEmergenciesByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const emergencies = await Emergency.find({ userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: emergencies.length,
      emergencies,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getEmergencyResponseTime = async (req, res) => {
  try {
    const { id } = req.params;

    const emergency = await Emergency.findById(id);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency not found",
      });
    }

    const start = emergency.timestamps.created;
    const end = emergency.timestamps.completed;

    if (!end) {
      return res.status(400).json({
        success: false,
        message: "Emergency not completed yet",
      });
    }

    const responseTimeMinutes = ((end - start) / 1000 / 60).toFixed(2);

    res.status(200).json({
      success: true,
      emergencyId: id,
      responseTimeMinutes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  createSOS,
  getAllEmergencies,
  updateEmergencyStatus,
  getEmergenciesByUser,
  getEmergencyResponseTime,
};