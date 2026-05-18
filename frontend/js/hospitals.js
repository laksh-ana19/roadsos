const map = L.map('map').setView([0,0], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'RoadSoS'
}).addTo(map);

const statusText = document.getElementById("statusText");
const hospitalList = document.getElementById("hospitalList");

// ---------------- DISTANCE ----------------
function dist(a,b,c,d){
  return Math.sqrt((a-c)**2 + (b-d)**2) * 111;
}

// ---------------- USER LOCATION ----------------
navigator.geolocation.getCurrentPosition(async(pos)=>{

  const userLat = pos.coords.latitude;
  const userLng = pos.coords.longitude;

  map.setView([userLat,userLng], 14);

  // USER MARKER
  L.marker([userLat,userLng])
    .addTo(map)
    .bindPopup("📍 You are here")
    .openPopup();

  statusText.innerText = "Searching nearby hospitals...";

  // ---------------- API QUERY ----------------
  const query = `
    [out:json];
    node["amenity"="hospital"](around:8000,${userLat},${userLng});
    out;
  `;

  const url =
    "https://overpass-api.de/api/interpreter?data=" +
    encodeURIComponent(query);

  const res = await fetch(url);
  const data = await res.json();

  if(!data.elements.length){
    statusText.innerText = "No hospitals found nearby";
    return;
  }

  statusText.innerText =
    `${data.elements.length} hospitals found nearby`;

  data.elements.forEach((h,index)=>{

    const distance =
      dist(userLat,userLng,h.lat,h.lon);

    // fake ETA
    const eta =
      Math.max(2,Math.floor(distance * 3));

    const name =
      h.tags?.name || `Hospital ${index+1}`;

    // ---------------- MAP MARKER ----------------
    const hospitalIcon = L.divIcon({
       className: "",
       html: `
        <div class="hospital-marker">
          🏥
        </div>
       `,
       iconSize: [34, 34],
       iconAnchor: [17, 17],
       popupAnchor: [0, -17]
    });

    const marker = L.marker([h.lat,h.lon], {
    icon: hospitalIcon
    })
      .addTo(map)
      .bindPopup(`
        🏥 <b>${name}</b><br>
        📏 ${distance.toFixed(2)} km<br>
        ⏱ ETA: ${eta} mins
      `);

    // ---------------- SIDE CARD ----------------
    const card = document.createElement("div");

    card.className = "hospital-card";

    card.innerHTML = `
      <h4>🏥 ${name}</h4>

      <p>📏 Distance:
      ${distance.toFixed(2)} km</p>

      <p>⏱ ETA:
      ${eta} mins</p>
    `;

    // hover focus
    card.addEventListener("mouseenter",()=>{
      map.flyTo([h.lat,h.lon],16,{
        duration:1.5
      });

      marker.openPopup();
    });

    hospitalList.appendChild(card);

  });

});