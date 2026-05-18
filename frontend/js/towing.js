const map = L.map('map').setView([0,0], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'RoadSoS'
}).addTo(map);

const statusText =
  document.getElementById("statusText");

const towingList =
  document.getElementById("towingList");

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
    "Searching nearby towing services...";

  // ---------------- QUERY ----------------
  const query = `
    [out:json];
    (
      node["shop"="car_repair"]
      (around:10000,${userLat},${userLng});

      node["amenity"="vehicle_inspection"]
      (around:10000,${userLat},${userLng});
    );
    out;
  `;

  const url =
    "https://overpass-api.de/api/interpreter?data=" +
    encodeURIComponent(query);

  const res = await fetch(url);
  const data = await res.json();

  if(!data.elements.length){
    statusText.innerText =
      "No towing services found nearby";
    return;
  }

  statusText.innerText =
    `${data.elements.length} towing services nearby`;

  data.elements.forEach((t,index)=>{

    const distance =
      dist(userLat,userLng,t.lat,t.lon);

    const eta =
      Math.max(2,Math.floor(distance * 2));

    const name =
      t.tags?.name || `Towing Service ${index+1}`;

    // ---------------- ICON ----------------
    const towingIcon = L.divIcon({
      html:`<div class="towing-marker">🔧</div>`,
      className:"",
      iconSize:[34,34],
      iconAnchor:[17,17],
      popupAnchor:[0,-17]
    });

    // ---------------- MARKER ----------------
    const marker = L.marker(
      [t.lat,t.lon],
      {icon:towingIcon}
    )
    .addTo(map)
    .bindPopup(`
      🔧 <b>${name}</b><br>
      📏 ${distance.toFixed(2)} km<br>
      ⏱ ETA: ${eta} mins
    `);

    // ---------------- CARD ----------------
    const card =
      document.createElement("div");

    card.className = "towing-card";

    card.innerHTML = `
      <h4>🔧 ${name}</h4>

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

      map.flyTo([t.lat,t.lon],16,{
        duration:1.5
      });

      marker.openPopup();

    });

    towingList.appendChild(card);

  });

});