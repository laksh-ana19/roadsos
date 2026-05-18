const axios = require("axios");

const HospitalCache = require("../models/HospitalCache");

const getNearbyHospitals = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude required",
      });
    }

    // Check cache first
    const cacheRadius = 0.05;

    const existingCache = await HospitalCache.findOne({
      centerLatitude: {
        $gte: Number(lat) - cacheRadius,
        $lte: Number(lat) + cacheRadius,
      },

      centerLongitude: {
        $gte: Number(lng) - cacheRadius,
        $lte: Number(lng) + cacheRadius,
      },
    });

    // Return cached hospitals
    if (existingCache) {
      console.log("Returning hospitals from cache");

      return res.status(200).json({
        success: true,
        source: "CACHE",
        count: existingCache.hospitals.length,
        hospitals: existingCache.hospitals,
      });
    }

    // Fetch from OpenStreetMap
    const query = `
      [out:json];
      (
        node["amenity"="hospital"](around:2000,${lat},${lng});
      );
      out;
    `;

    const url = `https://lz4.overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;s

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "RoadSoS Emergency App",
      },
    });

    const hospitals = response.data.elements.map((hospital) => ({
      id: hospital.id,

      name: hospital.tags?.name || "Unnamed Hospital",

      latitude: hospital.lat,

      longitude: hospital.lon,
    }));

    // Store new cache
    await HospitalCache.create({
      centerLatitude: Number(lat),

      centerLongitude: Number(lng),

      hospitals,
    });

    console.log("New hospitals cached");

    res.status(200).json({
      success: true,
      source: "API",
      count: hospitals.length,
      hospitals,
    });
  } catch (error) {
  console.error(error.response?.data || error.message);

  try {
    const { lat, lng } = req.query;

    const cacheRadius = 0.1;

    const fallbackCache =
      await HospitalCache.findOne({
        centerLatitude: {
          $gte: Number(lat) - cacheRadius,
          $lte: Number(lat) + cacheRadius,
        },

        centerLongitude: {
          $gte: Number(lng) - cacheRadius,
          $lte: Number(lng) + cacheRadius,
        },
      });

    if (fallbackCache) {
      console.log(
        "API failed — returning fallback cached hospitals"
      );

      return res.status(200).json({
        success: true,
        source: "FALLBACK_CACHE",
        count: fallbackCache.hospitals.length,
        hospitals: fallbackCache.hospitals,
      });
    }

    res.status(500).json({
      success: false,
      message:
        "Hospital service temporarily unavailable",
    });
  } catch (fallbackError) {
    console.error(fallbackError);

    res.status(500).json({
      success: false,
      message: "Failed to fetch hospitals",
    });
  }
}
};

module.exports = {
  getNearbyHospitals,
};