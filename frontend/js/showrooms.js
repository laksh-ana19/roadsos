const map = L.map('map').setView([0,0], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'RoadSoS'
}).addTo(map);

const statusText =
  document.getElementById("statusText");

const showroomList =
  document.getElementById("showroomList");

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
    "Searching nearby car showrooms...";

  // ---------------- QUERY ----------------
  const query = `
    [out:json];
    (
      node["shop"="car"](around:12000,${userLat},${userLng});
      node["shop"="car_repair"](around:12000,${userLat},${userLng});
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
      "No showrooms found nearby";
    return;
  }

  statusText.innerText =
    `${data.elements.length} showrooms nearby`;

  data.elements.forEach((s,index)=>{

    const distance =
      dist(userLat,userLng,s.lat,s.lon);

    const eta =
      Math.max(3,Math.floor(distance * 2));

    const name =
      s.tags?.name || `Showroom ${index+1}`;

    const icon = L.divIcon({
      html:`<div class="showroom-marker">🚗</div>`,
      className:"",
      iconSize:[34,34],
      iconAnchor:[17,17],
      popupAnchor:[0,-17]
    });

    const marker = L.marker(
      [s.lat,s.lon],
      {icon}
    )
    .addTo(map)
    .bindPopup(`
      🚗 <b>${name}</b><br>
      📏 ${distance.toFixed(2)} km<br>
      ⏱ ETA: ${eta} mins
    `);

    const card =
      document.createElement("div");

    card.className = "showroom-card";

    card.innerHTML = `
      <h4>🚗 ${name}</h4>

      <p>📏 Distance: ${distance.toFixed(2)} km</p>

      <p>⏱ ETA: ${eta} mins</p>
    `;

    card.addEventListener("mouseenter",()=>{

      map.flyTo([s.lat,s.lon],16,{
        duration:1.5
      });

      marker.openPopup();

    });

    showroomList.appendChild(card);

  });

});