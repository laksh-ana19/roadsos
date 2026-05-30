const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMS = async (toPhone, message) => {
  try {
    const result = await client.messages.create({
      body: message,
      from: "whatsapp:+14155238886",
      to: "whatsapp:+91" + toPhone
    });
    console.log("✅ WhatsApp sent to:", toPhone, "| SID:", result.sid);
    return true;
  } catch (error) {
    console.error("❌ WhatsApp failed:", error.message);
    return false;
  }
};

module.exports = sendSMS;