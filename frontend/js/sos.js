const panel = document.getElementById("sidePanel");
const overlay = document.getElementById("overlay");
const popup = document.getElementById("popup");
const sosButton = document.getElementById("sosButton");

function toggleMenu(event) {
  event.stopPropagation();
  panel.classList.add("active");
  overlay.classList.remove("hidden");
}

function closeMenu() {
  panel.classList.remove("active");
  overlay.classList.add("hidden");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

sosButton.addEventListener("click", async () => {
  popup.classList.remove("hidden");

  setTimeout(() => {
    popup.classList.add("hidden");
  }, 2500);

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const payload = {
      userId: localStorage.getItem("roadsos_userId") || "guest",
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      voiceTriggered: false,
    };

    try {
      const response = await fetch("http://localhost:5000/api/sos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("roadsos_active_emergency", data.emergency._id);
        console.log("Emergency created:", data.emergency._id);
        setTimeout(() => {
          window.location.href = "map.html?emergencyId=" + data.emergency._id;
        }, 2800);
      }
    } catch (error) {
      console.error("SOS failed:", error);
      alert("🚑 Ambulance & Emergency Services Notified");
      setTimeout(() => {
        window.location.href = "map.html";
      }, 2800);
    }
  });
});