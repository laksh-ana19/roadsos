const map = L.map('map').setView([0,0], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'RoadSoS'
}).addTo(map);

const statusText =
  document.getElementById("statusText");

const policeList =
  document.getElementById("policeList");

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
    "Searching nearby police stations...";

  // ---------------- QUERY ----------------
  const query = `
    [out:json];
    node["amenity"="police"]
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
      "No police stations found nearby";
    return;
  }

  statusText.innerText =
    `${data.elements.length} police stations nearby`;

  data.elements.forEach((p,index)=>{

    const distance =
      dist(userLat,userLng,p.lat,p.lon);

    const eta =
      Math.max(2,Math.floor(distance * 2));

    const name =
      p.tags?.name || `Police Station ${index+1}`;

    // ---------------- ICON ----------------
    const policeIcon = L.divIcon({
      html:`<div class="police-marker">🚓</div>`,
      className:"",
      iconSize:[34,34],
      iconAnchor:[17,17],
      popupAnchor:[0,-17]
    });

    // ---------------- MARKER ----------------
    const marker = L.marker(
      [p.lat,p.lon],
      {icon:policeIcon}
    )
    .addTo(map)
    .bindPopup(`
      🚓 <b>${name}</b><br>
      📏 ${distance.toFixed(2)} km<br>
      ⏱ ETA: ${eta} mins
    `);

    // ---------------- CARD ----------------
    const card =
      document.createElement("div");

    card.className = "police-card";

    card.innerHTML = `
      <h4>🚓 ${name}</h4>

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

      map.flyTo([p.lat,p.lon],16,{
        duration:1.5
      });

      marker.openPopup();

    });

    policeList.appendChild(card);

  });

});