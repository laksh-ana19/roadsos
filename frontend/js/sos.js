const panel = document.getElementById("sidePanel");
const overlay = document.getElementById("overlay");
const popup = document.getElementById("popup");

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