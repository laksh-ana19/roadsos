(function () {
  "use strict";

  const API_BASE     = "http://localhost:5000";
  const SOS_ENDPOINT = "/api/sos/";

  const KEYWORDS = {
    english:   ["sos", "help", "emergency", "accident", "save me", "help me", "call ambulance"],
    hindi:     ["bachao", "madad", "bachao mujhe", "help karo", "emergency hai", "ambulance bulao"],
    telugu:    ["sahayam", "sahayam cheyyi", "pramadam", "aapada", "ambulance pampinchu"],
    tamil:     ["uthavi", "avasaram"],
    kannada:   ["sahaaya", "nerevu", "apaaya"],
    malayalam: ["sahaayam", "rakshikkoo", "apadam"],
  };

  const ALL_KEYWORDS = Object.values(KEYWORDS).flat().map((k) => k.toLowerCase());

  function transcriptHasKeyword(transcript) {
    if (window.RoadSosKeywords) {
      var result = window.RoadSosKeywords.detect(transcript);
      if (result) {
        console.log("[VoiceSOS] Keyword matched via RoadSosKeywords:", result.keyword, "| Language:", result.language);
        return result.keyword;
      }
      return null;
    }
    var lower = transcript.toLowerCase();
    for (var i = 0; i < ALL_KEYWORDS.length; i++) {
      if (lower.includes(ALL_KEYWORDS[i])) return ALL_KEYWORDS[i];
    }
    return null;
  }

  let isListening      = false;
  let recognition      = null;
  let countdownTimer   = null;
  let countdownSeconds = 3;
  let cooldownActive   = false;
  const COOLDOWN_MS    = 30000;

  function injectUI() {
    const style = document.createElement("style");
    style.textContent = `
      #vsos-mic-btn {
        position: fixed;
        bottom: 28px; right: 28px;
        z-index: 9999;
        width: 62px; height: 62px;
        border-radius: 50%;
        border: 3px solid rgba(255,255,255,0.2);
        cursor: pointer;
        background: #1a1a2e;
        box-shadow: 0 4px 24px rgba(0,0,0,0.45);
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.2s, background 0.3s;
        outline: none;
      }
      #vsos-mic-btn:hover { transform: scale(1.1); }
      #vsos-mic-btn.listening {
        background: #c0392b;
        border-color: rgba(255,255,255,0.4);
        animation: vsos-pulse 1.4s infinite;
      }
      #vsos-mic-btn svg { width: 26px; height: 26px; fill: #fff; pointer-events: none; }

      #vsos-mic-btn::after {
        content: attr(data-label);
        position: absolute;
        right: 70px;
        background: #111; color: #fff;
        font-size: 12px; font-family: sans-serif;
        padding: 4px 10px; border-radius: 6px;
        white-space: nowrap; opacity: 0;
        transition: opacity 0.2s; pointer-events: none;
      }
      #vsos-mic-btn:hover::after { opacity: 1; }

      @keyframes vsos-pulse {
        0%   { box-shadow: 0 0 0 0   rgba(192,57,43,0.7); }
        70%  { box-shadow: 0 0 0 16px rgba(192,57,43,0);  }
        100% { box-shadow: 0 0 0 0   rgba(192,57,43,0);   }
      }

      #vsos-status-bar {
        position: fixed; top: 0; left: 0; right: 0;
        z-index: 10000; padding: 10px 18px;
        font-family: sans-serif; font-size: 14px; font-weight: 600;
        color: #fff; display: none; align-items: center; gap: 10px;
        transition: background 0.3s;
      }
      #vsos-status-bar.success { background: #27ae60; }
      #vsos-status-bar.warning { background: #e67e22; }
      #vsos-status-bar.danger  { background: #c0392b; }
      #vsos-status-bar.info    { background: #2980b9; }
      #vsos-status-bar .vsos-dot {
        width: 10px; height: 10px; border-radius: 50%;
        background: #fff; flex-shrink: 0;
        animation: vsos-blink 1s infinite;
      }
      @keyframes vsos-blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

      #vsos-countdown-overlay {
        position: fixed; inset: 0; z-index: 10001;
        background: rgba(192,57,43,0.92);
        display: none; flex-direction: column;
        align-items: center; justify-content: center;
        font-family: sans-serif; color: #fff; text-align: center;
      }
      .vsos-count-icon  { font-size: 48px; margin-bottom: 8px; }
      .vsos-count-num   { font-size: 100px; font-weight: 900; line-height: 1; animation: vsos-pop 0.4s ease; }
      .vsos-count-label { font-size: 22px; margin-top: 10px; opacity: 0.9; }
      .vsos-count-kw    { font-size: 14px; margin-top: 8px; opacity: 0.7; letter-spacing: 2px; text-transform: uppercase; }
      #vsos-cancel-btn  {
        margin-top: 36px; padding: 14px 40px;
        font-size: 16px; font-weight: 700;
        border: 2px solid #fff; border-radius: 40px;
        background: transparent; color: #fff;
        cursor: pointer; transition: background 0.2s;
      }
      #vsos-cancel-btn:hover { background: rgba(255,255,255,0.15); }

      @keyframes vsos-pop {
        0%  { transform: scale(0.4); opacity: 0; }
        70% { transform: scale(1.15); }
        100%{ transform: scale(1);   opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    const btn = document.createElement("button");
    btn.id = "vsos-mic-btn";
    btn.setAttribute("data-label", "Voice SOS OFF");
    btn.title = "Click to toggle Voice SOS";
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8 8 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93z"/></svg>`;
    btn.addEventListener("click", toggleListening);
    document.body.appendChild(btn);

    const bar = document.createElement("div");
    bar.id = "vsos-status-bar";
    bar.innerHTML = `<span class="vsos-dot"></span><span id="vsos-status-text"></span>`;
    document.body.appendChild(bar);

    const overlay = document.createElement("div");
    overlay.id = "vsos-countdown-overlay";
    overlay.innerHTML = `
      <div class="vsos-count-icon">🚨</div>
      <div class="vsos-count-num" id="vsos-count-num">3</div>
      <div class="vsos-count-label">Emergency SOS sending in...</div>
      <div class="vsos-count-kw"  id="vsos-count-kw"></div>
      <button id="vsos-cancel-btn">✕  Cancel</button>
    `;
    document.body.appendChild(overlay);
    document.getElementById("vsos-cancel-btn").addEventListener("click", cancelCountdown);
  }

  function showStatus(msg, type = "success", autoHideMs = 0) {
    const bar  = document.getElementById("vsos-status-bar");
    const text = document.getElementById("vsos-status-text");
    if (!bar || !text) return;
    bar.className     = type;
    text.textContent  = msg;
    bar.style.display = "flex";
    if (autoHideMs > 0) setTimeout(hideStatus, autoHideMs);
  }
  function hideStatus() {
    const bar = document.getElementById("vsos-status-bar");
    if (bar) bar.style.display = "none";
  }

  function setupRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      showStatus("Voice SOS not supported. Use Chrome browser.", "warning", 6000);
      return false;
    }

    recognition = new SR();
    recognition.continuous      = true;
    recognition.interimResults  = true;
    recognition.lang            = "en-IN";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListening = true;
      const btn = document.getElementById("vsos-mic-btn");
      if (btn) { btn.classList.add("listening"); btn.setAttribute("data-label", "Voice SOS ON"); }
      showStatus("🎤 Listening... Say 'SOS', 'Help', or 'Bachao'");
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        console.log("[VoiceSOS] Heard:", transcript);
        const matched = transcriptHasKeyword(transcript);
        if (matched && !countdownTimer && !cooldownActive) startCountdown(matched);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        showStatus("Mic permission denied. Allow microphone in browser settings.", "danger", 7000);
        stopListening();
      } else if (event.error === "no-speech") {
        restartListening();
      }
    };

    recognition.onend = () => {
      if (isListening) setTimeout(restartListening, 600);
    };

    return true;
  }

  function startListening() {
    if (!recognition && !setupRecognition()) return;
    try { recognition.start(); } catch (_) {}
  }
  function stopListening() {
    isListening = false;
    const btn = document.getElementById("vsos-mic-btn");
    if (btn) { btn.classList.remove("listening"); btn.setAttribute("data-label", "Voice SOS OFF"); }
    hideStatus();
    try { recognition && recognition.stop(); } catch (_) {}
  }
  function restartListening() {
    if (!isListening) return;
    try { recognition && recognition.start(); } catch (_) {}
  }
  function toggleListening() {
    if (isListening) {
      stopListening();
      showStatus("Voice SOS paused. Tap mic to resume.", "info", 3000);
    } else {
      isListening = true;
      startListening();
    }
  }

  function startCountdown(keyword) {
    countdownSeconds = 3;
    const overlay = document.getElementById("vsos-countdown-overlay");
    const numEl   = document.getElementById("vsos-count-num");
    const kwEl    = document.getElementById("vsos-count-kw");

    if (overlay) overlay.style.display = "flex";
    if (numEl)   numEl.textContent = countdownSeconds;
    if (kwEl)    kwEl.textContent  = 'Keyword: "' + keyword + '"';

    showStatus("SOS in " + countdownSeconds + "s... Tap Cancel to stop", "danger");

    countdownTimer = setInterval(function () {
      countdownSeconds--;
      if (numEl) {
        numEl.style.animation = "none";
        void numEl.offsetHeight;
        numEl.style.animation = "";
        numEl.textContent = countdownSeconds;
      }
      showStatus("SOS sending in " + countdownSeconds + "s...", "danger");

      if (countdownSeconds <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        if (overlay) overlay.style.display = "none";
        fireSOS(keyword);
      }
    }, 1000);
  }

  function cancelCountdown() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    const overlay = document.getElementById("vsos-countdown-overlay");
    if (overlay) overlay.style.display = "none";
    showStatus("SOS Cancelled.", "info", 3000);
  }

  function getLocation() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) return reject(new Error("No geolocation"));
      navigator.geolocation.getCurrentPosition(
        function (pos) { resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); },
        function (err) { reject(err); },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  async function fireSOS(keyword) {
    showStatus("Getting your location...", "info");

    let coords = { latitude: null, longitude: null };
    try {
      coords = await getLocation();
    } catch (err) {
      showStatus("GPS unavailable — sending SOS without location", "warning");
    }

    const payload = {
      userId:         getUserId(),
      latitude:       coords.latitude,
      longitude:      coords.longitude,
      voiceTriggered: true,
      keyword:        keyword,
    };

    showStatus("Sending SOS alert...", "danger");

    try {
      const response = await fetch(API_BASE + SOS_ENDPOINT, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("[VoiceSOS] SOS created. Emergency ID:", data.emergency && data.emergency._id);
        onSOSSuccess(data);
      } else {
        showStatus("SOS failed: " + data.message + ". Press manual SOS button.", "danger", 7000);
      }

    } catch (err) {
      console.error("[VoiceSOS] Network error:", err.message);
      queueOfflineSOS(payload);
    }

    startCooldown();
  }

  function onSOSSuccess(data) {
    showStatus("✅ SOS Sent! Emergency services alerted. Help is on the way.", "success", 10000);

    var popup =
      document.getElementById("sos-confirmation-popup") ||
      document.getElementById("emergencyPopup")         ||
      document.getElementById("sosPopup")               ||
      document.getElementById("confirmPopup");
    if (popup) popup.style.display = "flex";

    if (data.emergency && data.emergency._id) {
      setTimeout(function () {
        window.location.href = "ambulance.html?emergencyId=" + data.emergency._id;
      }, 2500);
    }
  }

  function startCooldown() {
    cooldownActive = true;
    setTimeout(function () { cooldownActive = false; }, COOLDOWN_MS);
  }

  var QUEUE_KEY = "roadsos_offline_queue";

  function queueOfflineSOS(payload) {
    showStatus("No internet! SOS saved — will send when reconnected.", "warning", 8000);
    try {
      var q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      q.push(Object.assign({}, payload, { queuedAt: new Date().toISOString() }));
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    } catch (e) { console.error("[VoiceSOS] localStorage error:", e); }
  }

  async function flushOfflineQueue() {
    var q = [];
    try { q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch (_) {}
    if (q.length === 0) return;

    showStatus("Back online — resending " + q.length + " queued SOS alert(s)...", "info");
    var sent = [];

    for (var i = 0; i < q.length; i++) {
      var payload = q[i];
      try {
        var res  = await fetch(API_BASE + SOS_ENDPOINT, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(Object.assign({}, payload, { offlineQueued: true })),
        });
        var data = await res.json();
        if (res.ok && data.success) sent.push(payload);
      } catch (e) { console.warn("[VoiceSOS] Retry failed:", e.message); }
    }

    var remaining = q.filter(function (item) { return sent.indexOf(item) === -1; });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    if (remaining.length === 0) showStatus("All queued SOS alerts sent.", "success", 5000);
  }

  window.addEventListener("online",  function () { flushOfflineQueue(); });
  window.addEventListener("offline", function () {
    showStatus("No internet. Voice SOS will queue if triggered.", "warning", 5000);
  });

  function getUserId() {
    return (
      localStorage.getItem("roadsos_userId") ||
      localStorage.getItem("userId")         ||
      sessionStorage.getItem("userId")       ||
      "guest"
    );
  }

  window.VoiceSOS = {
    trigger: function () { fireSOS("manual"); },
    stop:    stopListening,
    start:   startListening,
    toggle:  toggleListening,
  };

  function init() {
    injectUI();
    flushOfflineQueue();
    setTimeout(function () {
      isListening = true;
      startListening();
    }, 1200);
    console.log("[VoiceSOS] Module loaded. Keywords:", ALL_KEYWORDS.length, "total");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();