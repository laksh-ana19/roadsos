const { io } = require("socket.io-client");

const socket = io("http://localhost:5000");

const emergencyId = "12345";

socket.on("connect", () => {
  console.log("Connected to server");

  // Join emergency room
  socket.emit("joinEmergencyRoom", emergencyId);

  console.log(`Joined room: emergency_${emergencyId}`);

  // Send live ambulance updates
  setInterval(() => {
    const ambulanceData = {
      emergencyId,
      latitude: 12.9716 + Math.random() * 0.01,
      longitude: 80.2212 + Math.random() * 0.01,
      timestamp: new Date(),
    };

    socket.emit("ambulanceLocationUpdate", ambulanceData);

    console.log("Sent ambulance location:", ambulanceData);
  }, 3000);
});

socket.on("ambulanceLocationUpdated", (data) => {
  console.log("Received realtime update:", data);
});