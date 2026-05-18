require("dotenv").config();

const express = require("express");
const http = require("http");

const { Server } = require("socket.io");

const connectDB = require("./config/db");

const sosRoutes = require("./routes/sosRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const Emergency = require("./models/Emergency");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const PORT = process.env.PORT || 5000;

connectDB();

app.use(express.json());

app.use("/api/sos", sosRoutes);

app.use("/api/hospitals", hospitalRoutes);

app.get("/", (req, res) => {
  res.send("RoadSoS Backend Running");
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Join emergency room
  socket.on("joinEmergencyRoom", (emergencyId) => {
    const roomName = `emergency_${emergencyId}`;

    socket.join(roomName);

    console.log(`Socket joined room: ${roomName}`);
  });

  // Live ambulance tracking
  socket.on("ambulanceLocationUpdate", async (data) => {
  console.log("Live ambulance location:", data);

  try {
    await Emergency.findByIdAndUpdate(data.emergencyId, {
      ambulanceLocation: {
        latitude: data.latitude,
        longitude: data.longitude,
        updatedAt: new Date(),
      },
    });

    const roomName = `emergency_${data.emergencyId}`;

    io.to(roomName).emit("ambulanceLocationUpdated", data);
  } catch (error) {
    console.error("Realtime tracking DB error:", error.message);
  }
});

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});