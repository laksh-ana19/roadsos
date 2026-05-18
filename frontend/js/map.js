
const map = L.map('map').setView([0, 0], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'RoadSoS'
}).addTo(map);

// ---------------- STATE ----------------
let userLatLng = null;
let hospitalLatLng = null;
let selectedHospital = null;

// 🔥 STRICT STAGE CONTROL (IMPORTANT FIX)
let STAGE = "TO_PATIENT"; 
// TO_PATIENT → TO_HOSPITAL → DONE

let arrivedPatient = false;
let arrivedHospital = false;

// ---------------- ICONS ----------------
const userMarker = L.marker([0, 0]).addTo(map)
  .bindPopup("🚨 You are here");

const ambulanceIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2966/2966489.png",
  iconSize: [40, 40]
});

const hospitalIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/4320/4320371.png",
  iconSize: [35, 35]
});

let ambulanceMarker = null;

// ---------------- DISTANCE ----------------
function dist(a, b, c, d) {
  return Math.sqrt((a - c) ** 2 + (b - d) ** 2) * 111;
}

// ---------------- SAFE UI ----------------
function setStatus(msg){
  const el = document.getElementById("statusText");
  if(el) el.innerText = msg;
}

function safeSet(id, value){
  const el = document.getElementById(id);
  if(el) el.innerText = value;
}

// ---------------- FINAL POPUP ----------------
function showFinalPopup(msg){

  const box = document.createElement("div");

  box.style.position = "fixed";
  box.style.top = "50%";
  box.style.left = "50%";
  box.style.transform = "translate(-50%, -50%) scale(0.9)";
  box.style.padding = "24px 34px";
  box.style.background = "linear-gradient(135deg,#111,#1a1a1a)";
  box.style.color = "#fff";
  box.style.border = "2px solid #ff2d2d";
  box.style.borderRadius = "14px";
  box.style.fontSize = "18px";
  box.style.zIndex = "9999";
  box.style.textAlign = "center";
  box.style.boxShadow = "0 0 25px rgba(255,0,0,0.4)";
  box.style.fontWeight = "600";

  box.innerText = msg;

  document.body.appendChild(box);

  setTimeout(() => {
    box.style.opacity = "0";
    box.style.transform = "translate(-50%, -50%) scale(1.1)";
  }, 2200);

  setTimeout(() => box.remove(), 2800);
}

// ---------------- HOSPITAL FETCH ----------------
async function fetchHospitals(lat, lon) {

  const query = `
    [out:json];
    node["amenity"="hospital"](around:8000,${lat},${lon});
    out;
  `;

  const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);

  const res = await fetch(url);
  const data = await res.json();

  const hospitals = data.elements.map(h => {

    const distance = dist(lat, lon, h.lat, h.lon);

    const rating = h.tags?.rating
      ? parseFloat(h.tags.rating)
      : (3 + Math.random() * 2);

    return {
      lat: h.lat,
      lon: h.lon,
      name: h.tags?.name || "Hospital",
      rating,
      distance,
      score: distance - (rating * 2)
    };
  });

  return hospitals.sort((a, b) => a.score - b.score);
}

// ---------------- LERP ----------------
function lerp(a, b, t){
  return a + (b - a) * t;
}

// ---------------- SAVE ----------------
function saveEmergency(){

  const logs = JSON.parse(localStorage.getItem("EMERGENCIES") || "[]");

  logs.push({
    patient: userLatLng,
    ambulance: ambulanceMarker.getLatLng(),
    hospital: selectedHospital,
    time: Date.now()
  });

  localStorage.setItem("EMERGENCIES", JSON.stringify(logs));
}

// ---------------- INIT ----------------
navigator.geolocation.getCurrentPosition(async (pos) => {

  userLatLng = [pos.coords.latitude, pos.coords.longitude];

  map.setView(userLatLng, 15);
  userMarker.setLatLng(userLatLng);

  // reset system cleanly
  STAGE = "TO_PATIENT";
  arrivedPatient = false;
  arrivedHospital = false;

  setStatus("🚑 Ambulance is coming...");

  const ambulanceStart = [
    userLatLng[0] + (Math.random() - 0.5) * 0.02,
    userLatLng[1] + (Math.random() - 0.5) * 0.02
  ];

  ambulanceMarker = L.marker(ambulanceStart, {
    icon: ambulanceIcon
  }).addTo(map);

  const hospitals = await fetchHospitals(userLatLng[0], userLatLng[1]);

  selectedHospital = hospitals[0];
  hospitalLatLng = [selectedHospital.lat, selectedHospital.lon];

  L.marker(hospitalLatLng, {
    icon: hospitalIcon
  }).addTo(map).bindPopup(`🏥 ${selectedHospital.name}`);

  moveAmbulance();
});

// ---------------- LOOP ----------------
function moveAmbulance(){

  if(!userLatLng || !ambulanceMarker){
    requestAnimationFrame(moveAmbulance);
    return;
  }

  const target =
    STAGE === "TO_PATIENT" ? userLatLng :
    hospitalLatLng;

  const cur = ambulanceMarker.getLatLng();

  const SPEED=0.0035;
  const lat = lerp(cur.lat, target[0], SPEED);
  const lng = lerp(cur.lng, target[1], SPEED);

  ambulanceMarker.setLatLng([lat, lng]);

  const d = dist(lat, lng, target[0], target[1]);

  // ---------------- ETA ----------------
  const eta = d / SPEED;

  safeSet("distance", "Distance: " + d.toFixed(2) + " km");
  safeSet("eta", "ETA: " + Math.max(1, Math.floor(eta)) + " mins");

  // ---------------- PATIENT ARRIVAL ----------------
  if(STAGE === "TO_PATIENT" && !arrivedPatient && d < 0.01){

    arrivedPatient = true;

    setStatus("🚑 Ambulance reached patient");

    setTimeout(() => {
      STAGE = "TO_HOSPITAL";
      setStatus("🏥 Moving towards hospital...");
    }, 900);
  }

  // ---------------- HOSPITAL ARRIVAL ----------------
  if(STAGE === "TO_HOSPITAL" && !arrivedHospital && d < 0.01){

    arrivedHospital = true;

    setStatus("🏥 Ambulance reached hospital");

    setTimeout(() => {

      STAGE = "DONE";

      setStatus("✅ Emergency handled successfully");

      saveEmergency();

      showFinalPopup("🎉 Emergency Taken Care");

    }, 700);
  }

  requestAnimationFrame(moveAmbulance);
}