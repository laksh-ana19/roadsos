require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");
const Ambulance = require("./models/Ambulance");

const users = [
  {
    name: "Rajesh Kumar",
    phone: "9876543210",
    email: "rajesh@gmail.com",
    location: {
      type: "Point",
      coordinates: [80.2707, 13.0827],
    },
  },
  {
    name: "Priya Sharma",
    phone: "9876543211",
    email: "priya@gmail.com",
    location: {
      type: "Point",
      coordinates: [80.2785, 13.0878],
    },
  },
  {
    name: "Arun Venkat",
    phone: "9876543212",
    email: "arun@gmail.com",
    location: {
      type: "Point",
      coordinates: [80.2642, 13.0751],
    },
  },
];

const ambulances = [
  {
    vehicleNumber: "TN01AB1234",
    driverName: "Murugan R",
    driverPhone: "9500012301",
    location: {
      type: "Point",
      coordinates: [80.2707, 13.0827],
    },
    isAvailable: true,
  },
  {
    vehicleNumber: "TN02CD5678",
    driverName: "Selvam K",
    driverPhone: "9500012302",
    location: {
      type: "Point",
      coordinates: [80.2785, 13.0878],
    },
    isAvailable: true,
  },
  {
    vehicleNumber: "TN03EF9012",
    driverName: "Ravi S",
    driverPhone: "9500012303",
    location: {
      type: "Point",
      coordinates: [80.2642, 13.0751],
    },
    isAvailable: false,
  },
  {
    vehicleNumber: "TN04GH3456",
    driverName: "Kumar P",
    driverPhone: "9500012304",
    location: {
      type: "Point",
      coordinates: [80.2600, 13.0800],
    },
    isAvailable: true,
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    await User.deleteMany({});
    await Ambulance.deleteMany({});

    await User.insertMany(users);
    await Ambulance.insertMany(ambulances);

    console.log("✅ Users seeded successfully!");
    console.log("✅ Ambulances seeded successfully!");
    console.log("🎉 Database seeding completed!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
};

seedDatabase();