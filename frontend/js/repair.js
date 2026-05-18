const map = L.map('map').setView([0,0], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'RoadSoS'
}).addTo(map);

const statusText =
  document.getElementById("statusText");

const repairList =
  document.getElementById("repairList");

// ---------------- DISTANCE ----------------
function dist(a,b,c,d){
  return Math.sqrt((a-c)**2 + (b-d)**2) * 111;
}

// ---------------- USER LOCATION ----------------
navigator.geolocation.getCurrentPosition(async(pos)=>{

  const userLat = pos.coords.latitude;
  const userLng = pos.coords.longitude;

  map.setView([userLat,userLng],14);

  L.marker([userLat,userLng])
    .addTo(map)
    .bindPopup("📍 You are here")
    .openPopup();

  statusText.innerText =
    "Searching nearby repair shops...";

  // ---------------- OVERPASS QUERY ----------------
  const query = `
    [out:json];
    node["shop"="car_repair"](around:10000,${userLat},${userLng});
    out;
  `;

  const url =
    "https://overpass-api.de/api/interpreter?data=" +
    encodeURIComponent(query);

  const res = await fetch(url);
  const data = await res.json();

  if(!data.elements.length){
    statusText.innerText =
      "No repair shops found nearby";
    return;
  }

  statusText.innerText =
    `${data.elements.length} repair shops nearby`;

  data.elements.forEach((r,index)=>{

    const distance =
      dist(userLat,userLng,r.lat,r.lon);

    const eta =
      Math.max(2,Math.floor(distance * 2));

    const name =
      r.tags?.name || `Repair Shop ${index+1}`;

    const icon = L.divIcon({
      html:`<div class="repair-marker">🛞</div>`,
      className:"",
      iconSize:[34,34],
      iconAnchor:[17,17],
      popupAnchor:[0,-17]
    });

    const marker = L.marker(
      [r.lat,r.lon],
      {icon}
    )
    .addTo(map)
    .bindPopup(`
      🛞 <b>${name}</b><br>
      📏 ${distance.toFixed(2)} km<br>
      ⏱ ETA: ${eta} mins
    `);

    const card =
      document.createElement("div");

    card.className = "repair-card";

    card.innerHTML = `
      <h4>🛞 ${name}</h4>

      <p>📏 Distance: ${distance.toFixed(2)} km</p>

      <p>⏱ ETA: ${eta} mins</p>
    `;

    card.addEventListener("mouseenter",()=>{

      map.flyTo([r.lat,r.lon],16,{
        duration:1.5
      });

      marker.openPopup();

    });

    repairList.appendChild(card);

  });

});