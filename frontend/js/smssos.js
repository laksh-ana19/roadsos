(function () {
  "use strict";

  var EMERGENCY_NUMBERS = [
    { name: "National Emergency", number: "112", priority: 1 },
    { name: "Ambulance (108)", number: "108", priority: 2 },
    { name: "Police (100)", number: "100", priority: 3 },
    { name: "Fire (101)", number: "101", priority: 4 },
  ];

  var currentPayload = null;
  var contactQueue = [];
  var currentContact = 0;

  function buildMessage(payload, recipientName) {
    var mapsLink =
      payload.latitude && payload.longitude
        ? "https://maps.google.com/?q=" +
          payload.latitude +
          "," +
          payload.longitude
        : "Location unavailable";

    var time = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    var trigger = payload.voiceTriggered
      ? 'Voice keyword: "' +
        (payload.keyword || "SOS") +
        '"'
      : "Manual SOS button";

    var lines = [
      "🚨 EMERGENCY SOS — RoadSoS",
      "━━━━━━━━━━━━━━━━━━━━",
      recipientName
        ? "Hi " + recipientName + ", urgent alert!"
        : "Urgent emergency alert!",
      "",
      "A person needs IMMEDIATE help.",
      "",
      "📍 Live Location:",
      mapsLink,
      "",
      "⏰ Time: " + time,
      "👤 User ID: " +
        (payload.userId || "Unknown"),
      "📢 Triggered by: " + trigger,
      "",
      "Please call emergency services or go to the location immediately.",
      "",
      "— Sent via RoadSoS Emergency App",
    ];

    return lines.join("\n");
  }

  function sendSMSToNumber(phoneNumber, message) {
    var cleaned = phoneNumber
      .toString()
      .replace(/[\s\-\(\)]/g, "");

    if (
      cleaned.length === 10 &&
      !cleaned.startsWith("+")
    ) {
      cleaned = "+91" + cleaned;
    }

    var isIOS =
      /iPad|iPhone|iPod/.test(
        navigator.userAgent
      );

    var sep = isIOS ? "&" : "?";

    var smsURI =
      "sms:" +
      cleaned +
      sep +
      "body=" +
      encodeURIComponent(message);

    window.location.href = smsURI;

    return {
      number: cleaned,
      message: message,
    };
  }

  function getAllContacts() {
    var contacts = [];

    if (
      window.OfflineSOS &&
      window.OfflineSOS.getCachedContacts
    ) {
      var cached =
        window.OfflineSOS.getCachedContacts() ||
        [];

      cached.forEach(function (c) {
        if (c.phone || c.phoneNumber) {
          contacts.push({
            name:
              c.name ||
              c.contactName ||
              "Emergency Contact",
            number:
              c.phone || c.phoneNumber,
            type: "personal",
          });
        }
      });
    }

    try {
      var saved = JSON.parse(
        localStorage.getItem(
          "roadsos_contacts"
        ) || "[]"
      );

      saved.forEach(function (c) {
        if (c.phone || c.number) {
          contacts.push({
            name: c.name || "Contact",
            number:
              c.phone || c.number,
            type: "personal",
          });
        }
      });

    } catch (_) {}

    EMERGENCY_NUMBERS.forEach(function (e) {
      contacts.push({
        name: e.name,
        number: e.number,
        type: "emergency",
      });
    });

    var seen = {};

    contacts = contacts.filter(function (c) {
      var key = c.number
        .toString()
        .replace(/\D/g, "");

      if (seen[key]) return false;

      seen[key] = true;

      return true;
    });

    return contacts;
  }

  function send(payload) {
    currentPayload = payload || {};
    contactQueue = getAllContacts();
    currentContact = 0;

    if (contactQueue.length === 0) {
      showNoContactsUI();
      return;
    }

    showSMSPanel(payload);
  }

  function showSMSPanel(payload) {
    var existing = document.getElementById(
      "roadsos-sms-panel"
    );

    if (existing) {
      existing.remove();
    }

    var contacts = contactQueue;

    var contactRows = contacts
      .map(function (c, i) {
        var badge =
          c.type === "emergency"
            ? '<span style="background:#c0392b;color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:6px">Emergency</span>'
            : '<span style="background:#27ae60;color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:6px">Personal</span>';

        return `
        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:12px 0;
          border-bottom:1px solid rgba(255,255,255,0.08);
        ">
          <div>
            <div style="font-weight:600;font-size:14px">
              ${escapeHTML(c.name)} ${badge}
            </div>

            <div style="
              font-size:12px;
              opacity:0.6;
              margin-top:2px;
            ">
              ${escapeHTML(c.number)}
            </div>
          </div>

          <button
            onclick="window.SMSSOS.sendToIndex(${i})"
            style="
              padding:8px 16px;
              background:#e67e22;
              border:none;
              border-radius:6px;
              color:#fff;
              font-size:13px;
              font-weight:600;
              cursor:pointer;
              white-space:nowrap;
            "
          >
            📲 Send SMS
          </button>
        </div>
      `;
      })
      .join("");

    var panel = document.createElement("div");

    panel.id = "roadsos-sms-panel";

    panel.style.cssText = `
      position:fixed;
      inset:0;
      z-index:100001;
      background:rgba(0,0,0,0.88);
      display:flex;
      align-items:center;
      justify-content:center;
      font-family:sans-serif;
    `;

    panel.innerHTML = `
      <div style="
        background:#1a1a2e;
        color:#fff;
        border-radius:16px;
        padding:28px 24px;
        width:90%;
        max-width:420px;
        max-height:85vh;
        overflow-y:auto;
        border:2px solid #e67e22;
        box-shadow:0 8px 40px rgba(0,0,0,0.7);
      ">

        <div style="
          display:flex;
          align-items:center;
          gap:10px;
          margin-bottom:6px;
        ">
          <span style="font-size:28px">📲</span>

          <div>
            <h2 style="
              margin:0;
              font-size:18px;
              color:#e67e22;
            ">
              SMS Emergency Fallback
            </h2>

            <p style="
              margin:0;
              font-size:12px;
              opacity:0.6;
            ">
              Works without internet
            </p>
          </div>
        </div>

        <div style="
          background:rgba(255,255,255,0.06);
          border-radius:8px;
          padding:10px 12px;
          font-size:12px;
          opacity:0.8;
          margin:14px 0;
        ">
          📍 ${
            payload && payload.latitude
              ? payload.latitude.toFixed(5) +
                ", " +
                payload.longitude.toFixed(5)
              : "Location not available"
          }
          &nbsp;|&nbsp;
          ⏰ ${new Date().toLocaleTimeString()}
        </div>

        <button
          onclick="window.SMSSOS.sendAll()"
          style="
            width:100%;
            padding:13px;
            background:#c0392b;
            border:none;
            border-radius:8px;
            color:#fff;
            font-size:15px;
            font-weight:700;
            cursor:pointer;
            margin-bottom:16px;
          "
        >
          🚨 Send SOS to ALL Contacts
        </button>

        <div style="
          font-size:13px;
          opacity:0.6;
          margin-bottom:6px;
        ">
          Or send individually (${contacts.length} contacts):
        </div>

        ${contactRows}

        <div style="margin-top:16px">
          <div style="
            font-size:12px;
            opacity:0.5;
            margin-bottom:6px;
          ">
            📋 Message preview:
          </div>

          <div style="
            background:rgba(255,255,255,0.05);
            border-radius:8px;
            padding:10px;
            font-size:11px;
            opacity:0.7;
            white-space:pre-wrap;
            line-height:1.5;
            max-height:120px;
            overflow-y:auto;
          ">
            ${escapeHTML(
              buildMessage(payload, "Contact")
            )}
          </div>
        </div>

        <button
          onclick="document.getElementById('roadsos-sms-panel').remove()"
          style="
            width:100%;
            margin-top:14px;
            padding:10px;
            background:transparent;
            border:1px solid rgba(255,255,255,0.2);
            border-radius:8px;
            color:#fff;
            font-size:13px;
            cursor:pointer;
          "
        >
          Close
        </button>
      </div>
    `;

    document.body.appendChild(panel);
  }

  function sendToIndex(index) {
    var contact = contactQueue[index];

    if (!contact) return;

    var message = buildMessage(
      currentPayload,
      contact.name
    );

    sendSMSToNumber(
      contact.number,
      message
    );

    showSentFeedback(contact);
  }

  function sendAll() {
    if (contactQueue.length === 0) return;

    var panel = document.getElementById(
      "roadsos-sms-panel"
    );

    if (panel) {
      panel.remove();
    }

    showSequentialSender(0);
  }

  function showSequentialSender(index) {
    if (index >= contactQueue.length) {
      showAllSentConfirmation();
      return;
    }

    var contact = contactQueue[index];

    var total = contactQueue.length;

    var existing = document.getElementById(
      "roadsos-seq-sender"
    );

    if (existing) {
      existing.remove();
    }

    var div = document.createElement("div");

    div.id = "roadsos-seq-sender";

    div.style.cssText = `
      position:fixed;
      inset:0;
      z-index:100002;
      background:rgba(0,0,0,0.9);
      display:flex;
      align-items:center;
      justify-content:center;
      font-family:sans-serif;
    `;

    div.innerHTML = `
      <div style="
        background:#1a1a2e;
        color:#fff;
        border-radius:16px;
        padding:32px 28px;
        width:88%;
        max-width:380px;
        text-align:center;
        border:2px solid #27ae60;
        box-shadow:0 8px 40px rgba(0,0,0,0.7);
      ">

        <div style="
          font-size:40px;
          margin-bottom:8px;
        ">
          📲
        </div>

        <div style="
          font-size:12px;
          opacity:0.5;
          margin-bottom:4px;
        ">
          Contact ${index + 1} of ${total}
        </div>

        <h3 style="
          margin:0 0 4px;
          font-size:18px;
        ">
          ${escapeHTML(contact.name)}
        </h3>

        <div style="
          font-size:14px;
          opacity:0.6;
          margin-bottom:20px;
        ">
          ${escapeHTML(contact.number)}
        </div>

        <p style="
          font-size:13px;
          opacity:0.8;
          line-height:1.5;
          margin-bottom:20px;
        ">
          Your SMS app will open with the emergency message pre-filled.<br>
          <strong>Tap Send</strong> in your SMS app, then come back here.
        </p>

        <button
          onclick="window.SMSSOS._sendAndNext(${index})"
          style="
            width:100%;
            padding:14px;
            background:#27ae60;
            border:none;
            border-radius:8px;
            color:#fff;
            font-size:15px;
            font-weight:700;
            cursor:pointer;
            margin-bottom:10px;
          "
        >
          📲 Open SMS to ${escapeHTML(
            contact.name
          )}
        </button>

        <button
          onclick="window.SMSSOS._skipAndNext(${index})"
          style="
            width:100%;
            padding:10px;
            background:transparent;
            border:1px solid rgba(255,255,255,0.2);
            border-radius:8px;
            color:#fff;
            font-size:13px;
            cursor:pointer;
          "
        >
          Skip this contact →
        </button>
      </div>
    `;

    document.body.appendChild(div);
  }

  function _sendAndNext(index) {
    var contact = contactQueue[index];

    var message = buildMessage(
      currentPayload,
      contact.name
    );

    sendSMSToNumber(
      contact.number,
      message
    );

    setTimeout(function () {
      var existing =
        document.getElementById(
          "roadsos-seq-sender"
        );

      if (existing) {
        existing.remove();
      }

      showSequentialSender(index + 1);
    }, 3000);
  }

  function _skipAndNext(index) {
    var existing = document.getElementById(
      "roadsos-seq-sender"
    );

    if (existing) {
      existing.remove();
    }

    showSequentialSender(index + 1);
  }

  function showSentFeedback(contact) {
    var toast = document.createElement("div");

    toast.style.cssText = `
      position:fixed;
      bottom:100px;
      left:50%;
      transform:translateX(-50%);
      z-index:100003;
      background:#27ae60;
      color:#fff;
      padding:12px 24px;
      border-radius:30px;
      font-family:sans-serif;
      font-size:14px;
      font-weight:600;
      box-shadow:0 4px 20px rgba(0,0,0,0.4);
      white-space:nowrap;
    `;

    toast.textContent =
      "📲 SMS opened for " + contact.name;

    document.body.appendChild(toast);

    setTimeout(function () {
      toast.remove();
    }, 3000);
  }

  function showAllSentConfirmation() {
    var div = document.createElement("div");

    div.style.cssText = `
      position:fixed;
      inset:0;
      z-index:100003;
      background:rgba(0,0,0,0.88);
      display:flex;
      align-items:center;
      justify-content:center;
      font-family:sans-serif;
    `;

    div.innerHTML = `
      <div style="
        background:#1a1a2e;
        color:#fff;
        border-radius:16px;
        padding:36px 28px;
        width:88%;
        max-width:360px;
        text-align:center;
        border:2px solid #27ae60;
      ">

        <div style="
          font-size:52px;
          margin-bottom:12px;
        ">
          ✅
        </div>

        <h2 style="
          margin:0 0 10px;
          color:#27ae60;
        ">
          All SMS Sent!
        </h2>

        <p style="
          font-size:14px;
          opacity:0.8;
          margin-bottom:24px;
          line-height:1.5;
        ">
          Emergency alerts sent to all ${contactQueue.length} contacts.<br>
          Help should be on the way.
        </p>

        <button
          onclick="this.closest('div').parentElement.remove()"
          style="
            width:100%;
            padding:13px;
            background:#27ae60;
            border:none;
            border-radius:8px;
            color:#fff;
            font-size:15px;
            font-weight:700;
            cursor:pointer;
          "
        >
          OK — I'm waiting for help
        </button>
      </div>
    `;

    document.body.appendChild(div);
  }

  function showNoContactsUI() {
    var div = document.createElement("div");

    div.style.cssText = `
      position:fixed;
      inset:0;
      z-index:100003;
      background:rgba(0,0,0,0.88);
      display:flex;
      align-items:center;
      justify-content:center;
      font-family:sans-serif;
    `;

    div.innerHTML = `
      <div style="
        background:#1a1a2e;
        color:#fff;
        border-radius:16px;
        padding:32px 24px;
        width:88%;
        max-width:360px;
        text-align:center;
        border:2px solid #e67e22;
      ">

        <div style="
          font-size:48px;
          margin-bottom:12px;
        ">
          ⚠️
        </div>

        <h2 style="
          margin:0 0 10px;
          color:#e67e22;
        ">
          No Contacts Found
        </h2>

        <p style="
          font-size:14px;
          opacity:0.8;
          margin-bottom:20px;
          line-height:1.5;
        ">
          Add emergency contacts in the app settings.<br><br>
          Calling national emergency number instead:
        </p>

        <a
          href="tel:112"
          style="
            display:block;
            padding:13px;
            background:#c0392b;
            border-radius:8px;
            color:#fff;
            font-size:16px;
            font-weight:700;
            text-decoration:none;
            margin-bottom:10px;
          "
        >
          📞 Call 112 — National Emergency
        </a>

        <a
          href="tel:108"
          style="
            display:block;
            padding:11px;
            background:#e67e22;
            border-radius:8px;
            color:#fff;
            font-size:14px;
            font-weight:600;
            text-decoration:none;
            margin-bottom:14px;
          "
        >
          🚑 Call 108 — Ambulance
        </a>

        <button
          onclick="this.closest('div').parentElement.remove()"
          style="
            width:100%;
            padding:10px;
            background:transparent;
            border:1px solid rgba(255,255,255,0.2);
            border-radius:8px;
            color:#fff;
            font-size:13px;
            cursor:pointer;
          "
        >
          Close
        </button>
      </div>
    `;

    document.body.appendChild(div);
  }

  function escapeHTML(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  window.SMSSOS = {
    send: send,

    sendToIndex: sendToIndex,

    sendAll: sendAll,

    _sendAndNext: _sendAndNext,

    _skipAndNext: _skipAndNext,

    call: function (number) {
      window.location.href =
        "tel:" + number;
    },

    buildMessage: buildMessage,

    getContacts: getAllContacts,
  };

})();