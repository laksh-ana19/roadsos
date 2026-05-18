const list = document.getElementById("emergencyList");

function loadEmergencies(){

  const data = JSON.parse(localStorage.getItem("EMERGENCIES") || "[]");

  if(data.length === 0){
    list.innerHTML = "<p>No emergencies yet 🚑</p>";
    return;
  }

  list.innerHTML = "";

  // newest first
  const reversed = [...data].reverse();

  reversed.forEach((e, index) => {

    const card = document.createElement("div");
    card.className = "emergency-card";

    const date = new Date(e.time).toLocaleString();

    const patientLat =
      Array.isArray(e.patient) ? e.patient[0].toFixed(4) : "Unknown";

    const patientLng =
      Array.isArray(e.patient) ? e.patient[1].toFixed(4) : "Unknown";

    const hospitalLat =
      e.hospital?.lat ? e.hospital.lat.toFixed(4) : "Unknown";

    const hospitalLng =
      e.hospital?.lon ? e.hospital.lon.toFixed(4) : "Unknown";

    card.innerHTML = `
      <h4>🚨 Emergency #${data.length - index}</h4>

      <p>
        📍 Patient Location:<br>
        ${patientLat}, ${patientLng}
      </p>

      <p>
        🏥 Hospital:<br>
        ${e.hospital?.name || "Unknown"}
      </p>

      <p>
        🌍 Hospital Coordinates:<br>
        ${hospitalLat}, ${hospitalLng}
      </p>

      <p>⏰ Time: ${date}</p>

      <p>
        Status:
        <span style="color:lightgreen;">
          Completed
        </span>
      </p>
    `;

    list.appendChild(card);
  });
}

loadEmergencies();