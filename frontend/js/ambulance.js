const map = L.map('map').setView([0,0], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'RoadSoS'
}).addTo(map);

const statusText =
  document.getElementById("statusText");

const ambulanceList =
  document.getElementById("ambulanceList");

// ---------------- DISTANCE ----------------
function dist(a,b,c,d){
  return Math.sqrt((a-c)**2 + (b-d)**2) * 111;
}

// ---------------- USER LOCATION ----------------
navigator.geolocation.getCurrentPosition(async(pos)=>{

  const userLat = pos.coords.latitude;
  const userLng = pos.coords.longitude;

  map.setView([userLat,userLng],14);

  // USER MARKER
  L.marker([userLat,userLng])
    .addTo(map)
    .bindPopup("📍 You are here")
    .openPopup();

  statusText.innerText =
    "Searching nearby ambulance stations...";

  // ---------------- QUERY ----------------
  const query = `
    [out:json];
    node["emergency"="ambulance_station"]
    (around:10000,${userLat},${userLng});
    out;
  `;

  const url =
    "https://overpass-api.de/api/interpreter?data=" +
    encodeURIComponent(query);

  const res = await fetch(url);
  const data = await res.json();

  if(!data.elements.length){
    statusText.innerText =
      "No ambulance stations found nearby";
    return;
  }

  statusText.innerText =
    `${data.elements.length} ambulance stations nearby`;

  data.elements.forEach((a,index)=>{

    const distance =
      dist(userLat,userLng,a.lat,a.lon);

    const eta =
      Math.max(2,Math.floor(distance * 2));

    const name =
      a.tags?.name || `Ambulance Station ${index+1}`;

    // ---------------- ICON ----------------
    const ambulanceIcon = L.divIcon({
      html:`<div class="ambulance-marker">🚐</div>`,
      className:"",
      iconSize:[34,34],
      iconAnchor:[17,17],
      popupAnchor:[0,-17]
    });

    // ---------------- MARKER ----------------
    const marker = L.marker(
      [a.lat,a.lon],
      {icon:ambulanceIcon}
    )
    .addTo(map)
    .bindPopup(`
      🚐 <b>${name}</b><br>
      📏 ${distance.toFixed(2)} km<br>
      ⏱ ETA: ${eta} mins
    `);

    // ---------------- CARD ----------------
    const card =
      document.createElement("div");

    card.className = "ambulance-card";

    card.innerHTML = `
      <h4>🚐 ${name}</h4>

      <p>
        📏 Distance:
        ${distance.toFixed(2)} km
      </p>

      <p>
        ⏱ ETA:
        ${eta} mins
      </p>
    `;

    // HOVER FOCUS
    card.addEventListener("mouseenter",()=>{

      map.flyTo([a.lat,a.lon],16,{
        duration:1.5
      });

      marker.openPopup();

    });

    ambulanceList.appendChild(card);

  });

});