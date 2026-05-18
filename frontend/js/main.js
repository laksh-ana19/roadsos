function goToHome() {
  window.location.href = "home.html";
}

// -------------------- SOS GLOBAL HELPERS --------------------
function getEmergencyData() {
  return JSON.parse(localStorage.getItem("EMERGENCIES") || "[]");
}

function getLatestSOS() {
  return JSON.parse(localStorage.getItem("SOS_DATA") || "{}");
}

function clearSOS() {
  localStorage.removeItem("SOS_DATA");
}

function checkOnlineStatus(){

  const banner = document.getElementById("offlineBanner");

  function update(){
    if(!navigator.onLine){
      if(banner){
        banner.style.display = "block";
        banner.innerText = "⚠️ You are Offline - Emergency mode active";
      }
    } else {
      if(banner){
        banner.style.display = "none";
      }
    }
  }

  window.addEventListener("online", update);
  window.addEventListener("offline", update);

  update();
}

checkOnlineStatus();