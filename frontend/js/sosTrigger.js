(function () {
  "use strict";

  var API_BASE = "http://localhost:5000";
  var SOS_API = "/api/sos/";
  var STATUS_API = "/api/sos/{id}/status";
  var SOCKET_URL = "http://localhost:5000";

  var currentEmergency = null;
  var socket = null;
  var socketReady = false;

  function loadSocketIO(callback) {
    if (window.io) {
      callback();
      return;
    }

    var script = document.createElement("script");

    script.src = SOCKET_URL + "/socket.io/socket.io.js";

    script.onload = function () {
      callback();
    };

    script.onerror = function () {};

    document.head.appendChild(script);
  }

  function connectSocket() {
    if (!window.io) return;

    try {
      socket = window.io(SOCKET_URL);

      socket.on("connect", function () {
        socketReady = true;
      });

      socket.on("disconnect", function () {
        socketReady = false;
      });

      socket.on("ambulanceLocationUpdated", function (data) {
        handleAmbulanceUpdate(data);
      });

      socket.on("connect_error", function () {});

    } catch (e) {}
  }

  function joinEmergencyRoom(emergencyId) {
    if (!socket || !socketReady) {
      setTimeout(function () {
        joinEmergencyRoom(emergencyId);
      }, 2000);

      return;
    }

    socket.emit("joinEmergencyRoom", emergencyId);
  }

  function getLocation() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        return reject(new Error("Geolocation not supported"));
      }

      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        function (err) {
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        }
      );
    });
  }

  async function updateStatus(emergencyId, status) {
    var url = API_BASE + STATUS_API.replace("{id}", emergencyId);

    try {
      var res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: status,
        }),
      });

      var data = await res.json();

      if (res.ok && data.success) {
        return data.emergency;
      }

    } catch (e) {}

    return null;
  }

  async function triggerSOS(options) {
    options = options || {};

    var keyword = options.keyword || "manual";

    var voiceTriggered =
      options.voiceTriggered !== false;

    if (options.keyword === "manual") {
      voiceTriggered = false;
    }

    var coords = {
      latitude: null,
      longitude: null,
    };

    try {
      showTriggerStatus(
        "📡 Getting your GPS location...",
        "info"
      );

      coords = await getLocation();

    } catch (err) {
      showTriggerStatus(
        "GPS unavailable — sending SOS without location",
        "warning"
      );
    }

    var payload = {
      userId: getUserId(),
      latitude: coords.latitude,
      longitude: coords.longitude,
      voiceTriggered: voiceTriggered,
      keyword: keyword,
    };

    showTriggerStatus(
      "🚨 Sending SOS alert to emergency services...",
      "danger"
    );

    var emergency = null;

    try {
      var response = await fetch(API_BASE + SOS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      var data = await response.json();

      if (response.ok && data.success) {
        emergency = data.emergency;
        currentEmergency = emergency;
      } else {
        throw new Error(data.message || "SOS API failed");
      }

    } catch (err) {
      showTriggerStatus(
        "❌ SOS failed: " + err.message,
        "danger"
      );

      queueOffline(payload);

      return null;
    }

    await updateStatus(emergency._id, "triggered");

    joinEmergencyRoom(emergency._id);

    setTimeout(async function () {
      await updateStatus(
        emergency._id,
        "dispatched"
      );
    }, 8000);

    onTriggerSuccess(
      emergency,
      voiceTriggered,
      keyword
    );

    return emergency;
  }

  function onTriggerSuccess(
    emergency,
    voiceTriggered,
    keyword
  ) {
    showTriggerStatus(
      "✅ SOS Sent! Emergency ID: " +
        emergency._id.slice(-6).toUpperCase(),
      "success",
      12000
    );

    localStorage.setItem(
      "roadsos_active_emergency",
      emergency._id
    );

    localStorage.setItem(
      "roadsos_emergency_time",
      new Date().toISOString()
    );    

    var popup =
      document.getElementById(
        "sos-confirmation-popup"
      ) ||
      document.getElementById("emergencyPopup") ||
      document.getElementById("sosPopup") ||
      document.getElementById("confirmPopup");

    if (popup) {
      popup.style.display = "flex";

      var idSlot = popup.querySelector(
        ".emergency-id, #emergency-id, .emergencyId"
      );

      if (idSlot) {
        idSlot.textContent = emergency._id;
      }
    }

    setTimeout(function () {
      window.location.href =
        "ambulance.html?emergencyId=" +
        emergency._id;
    }, 8000);
  }

  function handleAmbulanceUpdate(data) {
    if (
      currentEmergency &&
      currentEmergency._id === data.emergencyId
    ) {
      updateStatus(
        data.emergencyId,
        "enroute"
      );
    }

    var event = new CustomEvent(
      "ambulanceLocationUpdated",
      {
        detail: data,
      }
    );

    window.dispatchEvent(event);
  }

  function showTriggerStatus(
    msg,
    type,
    autoHideMs
  ) {
    var bar =
      document.getElementById(
        "vsos-status-bar"
      );

    var text =
      document.getElementById(
        "vsos-status-text"
      );

    if (bar && text) {
      bar.className = type || "info";
      text.textContent = msg;
      bar.style.display = "flex";

      if (autoHideMs) {
        setTimeout(function () {
          bar.style.display = "none";
        }, autoHideMs);
      }

      return;
    }
  }

  var QUEUE_KEY = "roadsos_offline_queue";

  function queueOffline(payload) {
    try {
      var q = JSON.parse(
        localStorage.getItem(QUEUE_KEY) || "[]"
      );

      q.push(
        Object.assign({}, payload, {
          queuedAt: new Date().toISOString(),
        })
      );

      localStorage.setItem(
        QUEUE_KEY,
        JSON.stringify(q)
      );

    } catch (e) {}
  }

  function getUserId() {
    return (
      localStorage.getItem(
        "roadsos_userId"
      ) ||
      localStorage.getItem("userId") ||
      sessionStorage.getItem("userId") ||
      "guest"
    );
  }

  window.SOSTrigger = {
    fire: function (
      keyword,
      voiceTriggered
    ) {
      return triggerSOS({
        keyword: keyword || "manual",
        voiceTriggered:
          voiceTriggered !== undefined
            ? voiceTriggered
            : false,
      });
    },

    updateStatus: updateStatus,

    getActive: function () {
      return currentEmergency;
    },

    getActiveId: function () {
      return localStorage.getItem(
        "roadsos_active_emergency"
      );
    },

    getSocket: function () {
      return socket;
    },
  };

  function patchVoiceSOS() {
    if (window.VoiceSOS) {
      window.VoiceSOS.trigger =
        function (keyword) {
          return window.SOSTrigger.fire(
            keyword || "manual",
            keyword !== "manual"
          );
        };
    }
  }

  function wireManualSOSButton() {
    var btn =
      document.getElementById("sosButton") ||
      document.querySelector(".sos-btn") ||
      document.querySelector(".sos-button") ||
      document.querySelector("[data-sos]");

    if (!btn) return;

    if (btn.dataset.triggerWired) return;

    btn.dataset.triggerWired = "true";

    btn.addEventListener("click", function (e) {
      e.preventDefault();

      window.SOSTrigger.fire(
        "manual",
        false
      );
    });
  }

  function init() {
    loadSocketIO(function () {
      connectSocket();
    });

    wireManualSOSButton();

    patchVoiceSOS();

    var origVSOS =
      Object.getOwnPropertyDescriptor(
        window,
        "VoiceSOS"
      );

    Object.defineProperty(window, "VoiceSOS", {
      configurable: true,

      set: function (val) {
        Object.defineProperty(
          window,
          "VoiceSOS",
          {
            value: val,
            writable: true,
            configurable: true,
          }
        );

        patchVoiceSOS();
      },

      get: function () {
        return origVSOS
          ? origVSOS.value
          : undefined;
      },
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();