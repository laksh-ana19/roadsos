const panel = document.getElementById("sidePanel");
const overlay = document.getElementById("overlay");
const popup = document.getElementById("popup");
const sosButton = document.getElementById("sosButton");

function toggleMenu(event){
  event.stopPropagation();
  panel.classList.add("active");
  overlay.classList.remove("hidden");
}

function closeMenu(){
  panel.classList.remove("active");
  overlay.classList.add("hidden");
}

document.addEventListener("keydown", (e) => {
  if(e.key === "Escape") closeMenu();
});

sosButton.addEventListener("click", () => {

  popup.classList.remove("hidden");

  setTimeout(() => {
    popup.classList.add("hidden");
  }, 2500);

  setTimeout(() => {

    navigator.geolocation.getCurrentPosition((pos) => {

      const payload = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        time: Date.now()
      };

      localStorage.setItem("SOS_DATA", JSON.stringify(payload));

      alert("🚑 Ambulance & Emergency Services Notified");

      window.location.href = "map.html";
    });

  }, 2800);
});