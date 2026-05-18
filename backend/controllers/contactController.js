const EmergencyContact = require(
  "../models/EmergencyContact"
);

// Add emergency contact
const addEmergencyContact = async (
  req,
  res
) => {
  try {
    const {
      userId,
      name,
      phone,
      relationship,
    } = req.body;

    if (
      !userId ||
      !name ||
      !phone ||
      !relationship
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const contact =
      await EmergencyContact.create({
        userId,
        name,
        phone,
        relationship,
      });

    res.status(201).json({
      success: true,
      message:
        "Emergency contact added successfully",
      contact,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to add contact",
    });
  }
};

// Get user emergency contacts
const getEmergencyContacts = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;

    const contacts =
      await EmergencyContact.find({ userId });

    res.status(200).json({
      success: true,
      count: contacts.length,
      contacts,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch contacts",
    });
  }
};

module.exports = {
  addEmergencyContact,
  getEmergencyContacts,
};