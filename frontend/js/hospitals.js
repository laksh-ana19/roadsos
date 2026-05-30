// ---- Import cache helpers ----
// (inline since cache.js uses ES modules)
function saveCache(key, data) {
  localStorage.setItem(key, JSON.stringify({
    data,
    time: Date.now()
  }));
}

function getCache(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw).data;
}

// ---- Map setup ----
const map = L.map('map').setView([0, 0], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'RoadSoS'
}).addTo(map);

const statusText   = document.getElementById("statusText");
const hospitalList = document.getElementById("hospitalList");

// ---- Distance helper ----
function dist(a, b, c, d) {
  return Math.sqrt((a - c) ** 2 + (b - d) ** 2) * 111;
}

// ---- Render hospitals on map + sidebar ----
function renderHospitals(hospitals, userLat, userLng, isOffline) {

  if (isOffline) {
    const cached = getCache("roadsos_location_time");
    const timeStr = cached
      ? new Date(cached).toLocaleTimeString()
      : "unknown time";
    statusText.innerText =
      `⚠️ Offline — showing ${hospitals.length} cached hospitals (last updated ${timeStr})`;
    statusText.style.color = "#ff7b00";
  } else {
    statusText.innerText =
      `${hospitals.length} hospitals found nearby`;
    statusText.style.color = "";
  }

  hospitals.forEach((h, index) => {

    const distance = dist(userLat, userLng, h.lat, h.lon);
    const eta      = Math.max(2, Math.floor(distance * 3));
    const name     = h.name || `Hospital ${index + 1}`;

    // Map marker
    const hospitalIcon = L.divIcon({
      className: "",
      html: `<div class="hospital-marker">🏥</div>`,
      iconSize:    [34, 34],
      iconAnchor:  [17, 17],
      popupAnchor: [0, -17]
    });

    const marker = L.marker([h.lat, h.lon], { icon: hospitalIcon })
      .addTo(map)
      .bindPopup(`
        🏥 <b>${name}</b><br>
        📏 ${distance.toFixed(2)} km<br>
        ⏱ ETA: ${eta} mins
        ${isOffline ? '<br>⚠️ <i>Cached data</i>' : ''}
      `);

    // Sidebar card
    const card = document.createElement("div");
    card.className = "hospital-card";
    card.innerHTML = `
      <h4>🏥 ${name}</h4>
      <p>📏 Distance: ${distance.toFixed(2)} km</p>
      <p>⏱ ETA: ${eta} mins</p>
      ${isOffline ? '<p style="color:#ff7b00;font-size:0.8rem;">⚠️ Cached</p>' : ''}
    `;

    card.addEventListener("mouseenter", () => {
      map.flyTo([h.lat, h.lon], 16, { duration: 1.5 });
      marker.openPopup();
    });

    hospitalList.appendChild(card);
  });
}

// ---- Main logic ----
navigator.geolocation.getCurrentPosition(async (pos) => {

  const userLat = pos.coords.latitude;
  const userLng = pos.coords.longitude;

  map.setView([userLat, userLng], 14);

  // Always save last known location
  saveCache("roadsos_last_lat",  userLat);
  saveCache("roadsos_last_lng",  userLng);
  saveCache("roadsos_location_time", Date.now());

  L.marker([userLat, userLng])
    .addTo(map)
    .bindPopup("📍 You are here")
    .openPopup();

  // ---- ONLINE: fetch + cache ----
  // ---- Test REAL internet (not just localhost) ----
  let isActuallyOnline = false;
  try {
    const test = await fetch("https://overpass-api.de/api/status", {
      method: "HEAD",
      cache: "no-cache",
      signal: AbortSignal.timeout(3000)
    });
    isActuallyOnline = test.ok;
  } catch(e) {
    isActuallyOnline = false;
  }

  // ---- ONLINE: fetch + cache ----
  if (isActuallyOnline) {

    statusText.innerText = "Searching nearby hospitals...";

    try {
      const query = `
        [out:json];
        node["amenity"="hospital"](around:8000,${userLat},${userLng});
        out;
      `;

      const url =
        "https://overpass-api.de/api/interpreter?data=" +
        encodeURIComponent(query);

      const res  = await fetch(url);
      const data = await res.json();

      if (!data.elements.length) {
        statusText.innerText = "No hospitals found nearby";
        return;
      }

      // Normalize and CACHE hospital data
      const hospitals = data.elements.map(h => ({
        lat:  h.lat,
        lon:  h.lon,
        name: h.tags?.name || null
      }));

      saveCache("roadsos_hospitals", hospitals);
      console.log("✅ Hospitals cached:", hospitals.length);

      renderHospitals(hospitals, userLat, userLng, false);

    } catch (err) {
      console.error("Fetch failed, trying cache...", err);
      loadFromCache(userLat, userLng);
    }

  } else {
    // ---- OFFLINE: use cache ----
    loadFromCache(userLat, userLng);
  }

}, (err) => {
  // GPS failed — try last known location from cache
  console.warn("GPS failed:", err.message);
  loadFromCacheNoGPS();
});
// ---- Load from cache with known GPS ----
function loadFromCache(userLat, userLng) {
  const hospitals = getCache("roadsos_hospitals");

  if (!hospitals || hospitals.length === 0) {
    statusText.innerText =
      "⚠️ Offline and no cached data. Please go online once first.";
    statusText.style.color = "#ff4444";
    return;
  }

  renderHospitals(hospitals, userLat, userLng, true);
}

// ---- Load from cache when GPS also failed ----
function loadFromCacheNoGPS() {
  const lastLat   = getCache("roadsos_last_lat");
  const lastLng   = getCache("roadsos_last_lng");
  const hospitals = getCache("roadsos_hospitals");

  if (!lastLat || !hospitals) {
    statusText.innerText =
      "⚠️ No GPS and no cached data available.";
    statusText.style.color = "#ff4444";
    return;
  }

  map.setView([lastLat, lastLng], 14);

  L.marker([lastLat, lastLng])
    .addTo(map)
    .bindPopup("📍 Last known location")
    .openPopup();

  renderHospitals(hospitals, lastLat, lastLng, true);
}