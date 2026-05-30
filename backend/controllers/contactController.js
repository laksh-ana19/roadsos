const EmergencyContact = require("../models/EmergencyContact");

/* =========================
   ADD CONTACT
========================= */
const addEmergencyContact = async (req, res) => {
  try {
    const { userId, name, phone, relationship } = req.body;

    if (!userId || !name || !phone || !relationship) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const contact = await EmergencyContact.create({
      userId,
      name,
      phone,
      relationship,
    });

    res.status(201).json({
      success: true,
      message: "Emergency contact added successfully",
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

/* =========================
   GET CONTACTS BY USER
========================= */
const getEmergencyContacts = async (req, res) => {
  try {
    const { userId } = req.params;

    const contacts = await EmergencyContact.find({ userId });

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

/* =========================
   DELETE CONTACT
========================= */
const deleteEmergencyContact = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await EmergencyContact.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Contact deleted successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete contact",
    });
  }
};

/* =========================
   EDIT CONTACT
========================= */
const updateEmergencyContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, relationship } = req.body;

    const updated = await EmergencyContact.findByIdAndUpdate(
      id,
      { name, phone, relationship },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Contact updated successfully",
      contact: updated,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update contact",
    });
  }
};

module.exports = {
  addEmergencyContact,
  getEmergencyContacts,
  deleteEmergencyContact,
  updateEmergencyContact,
};