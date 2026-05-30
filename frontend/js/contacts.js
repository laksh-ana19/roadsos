const API_BASE = "http://localhost:5000";
const USER_ID  = "guest";

let currentEditId = null;
let deleteId      = null;

/* =========================
   NAVIGATION
========================= */

function goHome() {
    window.location.href = "home.html";
}

/* =========================
   MODAL OPEN / CLOSE
========================= */

function openModal() {
    document.getElementById("contactModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("contactModal").style.display = "none";
    document.getElementById("name").value     = "";
    document.getElementById("phone").value    = "";
    document.getElementById("relation").value = "";
    document.getElementById("modalTitle").innerText = "Add Emergency Contact";
    currentEditId = null;
}

/* =========================
   LOAD CONTACTS FROM MONGODB
========================= */

async function loadContacts() {
    try {
        const res  = await fetch(`${API_BASE}/api/contacts/${USER_ID}`);
        const data = await res.json();

        document.getElementById("loadingMsg").style.display = "none";

        const grid = document.getElementById("contactsGrid");
        grid.innerHTML = "";

        if (!data.success || data.contacts.length === 0) {
            grid.innerHTML = `<p style="color:#aaa;text-align:center;">
                No contacts yet. Tap + to add one.</p>`;
            return;
        }

        data.contacts.forEach(contact => {
            const card = document.createElement("div");
            card.className = "contact-card";
            card.innerHTML = `
                <div class="contact-top">
                    <div>
                        <div class="contact-name">${contact.name}</div>
                        <div class="contact-phone">${contact.phone}</div>
                        <div class="contact-relation">${contact.relationship}</div>
                    </div>
                    <div class="actions">
                        <button class="edit-btn"
                            onclick="editContact('${contact._id}','${contact.name}',
                            '${contact.phone}','${contact.relationship}')">✏️</button>
                        <button class="delete-btn"
                            onclick="deleteContact('${contact._id}')">🗑️</button>
                    </div>
                </div>`;
            grid.appendChild(card);
        });

        localStorage.setItem("roadsos_contacts", JSON.stringify(
            data.contacts.map(c => ({ name: c.name, phone: c.phone }))
        ));

    } catch (err) {
        document.getElementById("loadingMsg").innerText =
            "Could not load contacts. Is the backend running?";
        console.error("loadContacts error:", err);
    }
}

/* =========================
   SAVE CONTACT (ADD or EDIT)
========================= */

async function saveContact() {
    const name     = document.getElementById("name").value.trim();
    const phone    = document.getElementById("phone").value.trim();
    const relation = document.getElementById("relation").value.trim();

    if (!name || !phone || !relation) {
        alert("Please fill all fields");
        return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
        alert("Enter a valid 10-digit phone number");
        return;
    }

    try {
        if (currentEditId) {
            await fetch(`${API_BASE}/api/contacts/update/${currentEditId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, phone, relationship: relation })
            });
        } else {
            await fetch(`${API_BASE}/api/contacts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: USER_ID,
                    name,
                    phone,
                    relationship: relation
                })
            });
        }

        closeModal();
        loadContacts();

    } catch (err) {
        alert("Failed to save contact. Is the backend running?");
        console.error("saveContact error:", err);
    }
}

/* =========================
   EDIT CONTACT
========================= */

function editContact(id, name, phone, relationship) {
    document.getElementById("name").value     = name;
    document.getElementById("phone").value    = phone;
    document.getElementById("relation").value = relationship;
    document.getElementById("modalTitle").innerText = "Edit Emergency Contact";
    currentEditId = id;
    openModal();
}

/* =========================
   DELETE CONTACT
========================= */

function deleteContact(id) {
    deleteId = id;
    document.getElementById("deleteModal").style.display = "flex";
}

async function confirmDelete() {
    try {
        await fetch(`${API_BASE}/api/contacts/delete/${deleteId}`, {
            method: "DELETE"
        });
        closeDeleteModal();
        loadContacts();
    } catch (err) {
        alert("Failed to delete. Is the backend running?");
        console.error("confirmDelete error:", err);
    }
}

function closeDeleteModal() {
    document.getElementById("deleteModal").style.display = "none";
    deleteId = null;
}

/* =========================
   INIT
========================= */

window.onload = loadContacts;