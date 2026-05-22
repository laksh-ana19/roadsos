(function () {
  "use strict";

  var API_BASE = "http://localhost:5000";
  var SOS_API = "/api/sos/";
  var CONTACTS_API = "/api/contacts/";
  var DB_NAME = "RoadSoSOfflineDB";
  var DB_VERSION = 1;
  var STORE_SOS = "sos_queue";
  var STORE_CACHE = "service_cache";
  var LS_KEY = "roadsos_offline_queue";
  var LS_CACHE = "roadsos_service_cache";

  var isOnline = navigator.onLine;
  var db = null;
  var isSyncing = false;

  function initDB() {
    return new Promise(function (resolve) {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }

      var req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = function (event) {
        var database = event.target.result;

        if (!database.objectStoreNames.contains(STORE_SOS)) {
          var sosStore = database.createObjectStore(
            STORE_SOS,
            {
              keyPath: "localId",
              autoIncrement: true,
            }
          );

          sosStore.createIndex(
            "queuedAt",
            "queuedAt",
            { unique: false }
          );

          sosStore.createIndex(
            "synced",
            "synced",
            { unique: false }
          );
        }

        if (
          !database.objectStoreNames.contains(
            STORE_CACHE
          )
        ) {
          database.createObjectStore(
            STORE_CACHE,
            {
              keyPath: "cacheKey",
            }
          );
        }
      };

      req.onsuccess = function (event) {
        db = event.target.result;
        resolve(db);
      };

      req.onerror = function () {
        resolve(null);
      };
    });
  }

  function queueToIndexedDB(payload) {
    return new Promise(function (resolve) {
      if (!db) {
        resolve(false);
        return;
      }

      var record = Object.assign({}, payload, {
        queuedAt: new Date().toISOString(),
        synced: false,
        retries: 0,
      });

      var tx = db.transaction(
        STORE_SOS,
        "readwrite"
      );

      var store = tx.objectStore(STORE_SOS);

      var req = store.add(record);

      req.onsuccess = function () {
        resolve(true);
      };

      req.onerror = function () {
        resolve(false);
      };
    });
  }

  function queueToLocalStorage(payload) {
    try {
      var q = JSON.parse(
        localStorage.getItem(LS_KEY) || "[]"
      );

      q.push(
        Object.assign({}, payload, {
          queuedAt: new Date().toISOString(),
          synced: false,
        })
      );

      localStorage.setItem(
        LS_KEY,
        JSON.stringify(q)
      );

      return true;

    } catch (e) {
      return false;
    }
  }

  async function queueSOS(payload) {
    var savedToIDB =
      await queueToIndexedDB(payload);

    var savedToLS =
      queueToLocalStorage(payload);

    if (savedToIDB || savedToLS) {
      showOfflineConfirmation(payload);

      triggerSMSFallback(payload);

      return true;
    }

    return false;
  }

  async function syncQueue() {
    if (isSyncing || !isOnline) return;

    isSyncing = true;

    updateOfflineBanner();

    var synced = 0;
    var failed = 0;

    if (db) {
      var pending =
        await getPendingFromIDB();

      for (var i = 0; i < pending.length; i++) {
        var record = pending[i];

        var result =
          await sendToAPI(record);

        if (result) {
          await markSyncedInIDB(
            record.localId
          );

          synced++;

        } else {
          await incrementRetriesInIDB(
            record.localId
          );

          failed++;
        }
      }
    }

    var lsQueue = [];

    try {
      lsQueue = JSON.parse(
        localStorage.getItem(LS_KEY) || "[]"
      );
    } catch (_) {}

    var lsRemaining = [];

    for (var j = 0; j < lsQueue.length; j++) {
      var item = lsQueue[j];

      var lsResult =
        await sendToAPI(item);

      if (lsResult) {
        synced++;
      } else {
        lsRemaining.push(item);
        failed++;
      }
    }

    localStorage.setItem(
      LS_KEY,
      JSON.stringify(lsRemaining)
    );

    isSyncing = false;

    if (synced > 0) {
      showStatus(
        "✅ " +
          synced +
          " queued SOS alert(s) sent successfully.",
        "success",
        7000
      );
    }

    if (failed > 0) {
      showStatus(
        "⚠️ " +
          failed +
          " SOS alert(s) failed to send. Will retry.",
        "warning",
        7000
      );
    }
  }

  async function sendToAPI(payload) {
    try {
      var res = await fetch(
        API_BASE + SOS_API,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            Object.assign({}, payload, {
              offlineQueued: true,
            })
          ),
        }
      );

      var data = await res.json();

      if (res.ok && data.success) {
        return data.emergency;
      }

      return null;

    } catch (e) {
      return null;
    }
  }

  function getPendingFromIDB() {
    return new Promise(function (resolve) {
      if (!db) {
        resolve([]);
        return;
      }

      var results = [];

      var tx = db.transaction(
        STORE_SOS,
        "readonly"
      );

      var store = tx.objectStore(STORE_SOS);

      var idx = store.index("synced");

      var req = idx.openCursor(
        IDBKeyRange.only(false)
      );

      req.onsuccess = function (event) {
        var cursor = event.target.result;

        if (cursor) {
          if (
            (cursor.value.retries || 0) < 5
          ) {
            results.push(cursor.value);
          }

          cursor.continue();

        } else {
          resolve(results);
        }
      };

      req.onerror = function () {
        resolve([]);
      };
    });
  }

  function markSyncedInIDB(localId) {
    return new Promise(function (resolve) {
      if (!db) {
        resolve();
        return;
      }

      var tx = db.transaction(
        STORE_SOS,
        "readwrite"
      );

      var store = tx.objectStore(STORE_SOS);

      var req = store.get(localId);

      req.onsuccess = function () {
        var record = req.result;

        record.synced = true;

        record.syncedAt =
          new Date().toISOString();

        store.put(record);

        resolve();
      };

      req.onerror = function () {
        resolve();
      };
    });
  }

  function incrementRetriesInIDB(localId) {
    return new Promise(function (resolve) {
      if (!db) {
        resolve();
        return;
      }

      var tx = db.transaction(
        STORE_SOS,
        "readwrite"
      );

      var store = tx.objectStore(STORE_SOS);

      var req = store.get(localId);

      req.onsuccess = function () {
        var record = req.result;

        record.retries =
          (record.retries || 0) + 1;

        store.put(record);

        resolve();
      };

      req.onerror = function () {
        resolve();
      };
    });
  }

  async function cacheEmergencyServices() {
    if (!isOnline) return;

    try {
      var res = await fetch(
        API_BASE + CONTACTS_API
      );

      var data = await res.json();

      if (res.ok) {
        localStorage.setItem(
          LS_CACHE,
          JSON.stringify({
            contacts:
              data.contacts || data,
            cachedAt:
              new Date().toISOString(),
          })
        );

        if (db) {
          var tx = db.transaction(
            STORE_CACHE,
            "readwrite"
          );

          var store =
            tx.objectStore(STORE_CACHE);

          store.put({
            cacheKey:
              "emergency_contacts",
            data:
              data.contacts || data,
            cachedAt:
              new Date().toISOString(),
          });
        }
      }

    } catch (e) {}
  }

  function getCachedContacts() {
    try {
      var cached = JSON.parse(
        localStorage.getItem(LS_CACHE) ||
          "null"
      );

      return cached
        ? cached.contacts
        : [];

    } catch (_) {
      return [];
    }
  }

  function injectOfflineBannerStyles() {
    var style =
      document.createElement("style");

    style.textContent = `
      #roadsos-offline-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 99999;
        padding: 10px 18px;
        font-family: sans-serif;
        font-size: 13px;
        font-weight: 600;
        color: #fff;
        display: none;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        background: #e67e22;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: background 0.4s;
      }

      #roadsos-offline-banner.offline {
        background: #c0392b;
      }

      #roadsos-offline-banner.syncing {
        background: #2980b9;
      }

      #roadsos-offline-banner.online {
        background: #27ae60;
      }

      .roadsos-banner-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .roadsos-banner-icon {
        font-size: 18px;
      }

      .roadsos-banner-queue {
        background: rgba(255,255,255,0.25);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 12px;
      }

      .roadsos-banner-sms {
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.5);
        padding: 4px 12px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        color: #fff;
        white-space: nowrap;
      }

      .roadsos-banner-sms:hover {
        background: rgba(255,255,255,0.35);
      }

      body.roadsos-offline-active {
        padding-top: 44px !important;
      }
    `;

    document.head.appendChild(style);
  }

  function createOfflineBanner() {
    var banner =
      document.createElement("div");

    banner.id =
      "roadsos-offline-banner";

    banner.innerHTML = `
      <div class="roadsos-banner-left">
        <span
          class="roadsos-banner-icon"
          id="roadsos-banner-icon"
        >
          📴
        </span>

        <span id="roadsos-banner-text">
          You are offline — SOS will be queued
        </span>

        <span
          class="roadsos-banner-queue"
          id="roadsos-banner-queue"
          style="display:none"
        >
          0 queued
        </span>
      </div>

      <button
        class="roadsos-banner-sms"
        id="roadsos-banner-sms"
        onclick="window.OfflineSOS.sendSMSFallback()"
      >
        📲 Send SMS SOS
      </button>
    `;

    document.body.appendChild(banner);
  }

  function updateOfflineBanner() {
    var banner = document.getElementById(
      "roadsos-offline-banner"
    );

    var icon = document.getElementById(
      "roadsos-banner-icon"
    );

    var text = document.getElementById(
      "roadsos-banner-text"
    );

    var queue = document.getElementById(
      "roadsos-banner-queue"
    );

    var smsBtn = document.getElementById(
      "roadsos-banner-sms"
    );

    if (!banner) return;

    var queueCount = getQueueCount();

    if (!isOnline) {
      banner.className = "offline";

      banner.style.display = "flex";

      icon.textContent = "📴";

      text.textContent =
        "No internet — SOS will be saved and sent when reconnected";

      document.body.classList.add(
        "roadsos-offline-active"
      );

      if (smsBtn) {
        smsBtn.style.display = "block";
      }

    } else if (isSyncing) {
      banner.className = "syncing";

      banner.style.display = "flex";

      icon.textContent = "📡";

      text.textContent =
        "Back online — sending queued SOS alerts...";

      if (smsBtn) {
        smsBtn.style.display = "none";
      }

    } else if (queueCount > 0) {
      banner.className = "online";

      banner.style.display = "flex";

      icon.textContent = "✅";

      text.textContent =
        "Online — " +
        queueCount +
        " SOS alert(s) sent";

      setTimeout(hideBanner, 5000);

    } else {
      hideBanner();
    }

    if (queue) {
      if (queueCount > 0) {
        queue.style.display = "inline";

        queue.textContent =
          queueCount + " queued";

      } else {
        queue.style.display = "none";
      }
    }
  }

  function hideBanner() {
    var banner = document.getElementById(
      "roadsos-offline-banner"
    );

    if (banner) {
      banner.style.display = "none";
    }

    document.body.classList.remove(
      "roadsos-offline-active"
    );
  }

  function getQueueCount() {
    try {
      return JSON.parse(
        localStorage.getItem(LS_KEY) || "[]"
      ).length;

    } catch (_) {
      return 0;
    }
  }

  function showOfflineConfirmation(payload) {
    var existing = document.getElementById(
      "roadsos-offline-confirm"
    );

    if (existing) {
      existing.remove();
    }

    var div =
      document.createElement("div");

    div.id =
      "roadsos-offline-confirm";

    div.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 100000;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
    `;

    div.innerHTML = `
      <div style="
        background:#1a1a2e;
        color:#fff;
        border-radius:16px;
        padding:36px 32px;
        max-width:360px;
        text-align:center;
        border:2px solid #e67e22;
        box-shadow:0 8px 40px rgba(0,0,0,0.6);
      ">

        <div style="
          font-size:52px;
          margin-bottom:12px;
        ">
          📴
        </div>

        <h2 style="
          margin:0 0 8px;
          font-size:20px;
          color:#e67e22;
        ">
          SOS Saved — No Internet
        </h2>

        <p style="
          margin:0 0 16px;
          opacity:0.85;
          font-size:14px;
          line-height:1.5;
        ">
          Your SOS has been saved on this device.<br>
          It will be sent <strong>automatically</strong>
          when your internet connection is restored.
        </p>

        <div style="
          background:rgba(255,255,255,0.08);
          border-radius:8px;
          padding:12px;
          font-size:12px;
          opacity:0.75;
          margin-bottom:20px;
          text-align:left;
        ">
          <div>
            📍 Location:
            ${
              payload.latitude
                ? payload.latitude.toFixed(
                    4
                  ) +
                  ", " +
                  payload.longitude.toFixed(
                    4
                  )
                : "Not available"
            }
          </div>

          <div>
            ⏰ Time:
            ${new Date().toLocaleTimeString()}
          </div>

          <div>
            👤 User:
            ${payload.userId || "guest"}
          </div>
        </div>

        <button
          onclick="window.OfflineSOS.sendSMSFallback()"
          style="
            width:100%;
            padding:14px;
            background:#e67e22;
            border:none;
            border-radius:8px;
            color:#fff;
            font-size:15px;
            font-weight:700;
            cursor:pointer;
            margin-bottom:10px;
          "
        >
          📲 Send SMS SOS Instead
        </button>

        <button
          onclick="document.getElementById('roadsos-offline-confirm').remove()"
          style="
            width:100%;
            padding:10px;
            background:transparent;
            border:1px solid rgba(255,255,255,0.3);
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

  function showStatus(
    msg,
    type,
    autoHideMs
  ) {
    var bar = document.getElementById(
      "vsos-status-bar"
    );

    var text = document.getElementById(
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
    }
  }

  function triggerSMSFallback(payload) {
    if (window.SMSSOS) {
      window.SMSSOS.send(payload);
      return;
    }

    basicSMSFallback(payload);
  }

  function basicSMSFallback(payload) {
    var contacts =
      getCachedContacts();

    var phoneNumber = "";

    if (
      contacts &&
      contacts.length > 0
    ) {
      phoneNumber =
        contacts[0].phone ||
        contacts[0].phoneNumber ||
        "";
    }

    var mapsLink =
      payload.latitude &&
      payload.longitude
        ? "https://maps.google.com/?q=" +
          payload.latitude +
          "," +
          payload.longitude
        : "Location not available";

    var message =
      "🚨 EMERGENCY SOS - RoadSoS Alert\n" +
      "User needs immediate help!\n" +
      "Location: " +
      mapsLink +
      "\n" +
      "Time: " +
      new Date().toLocaleString() +
      "\n" +
      "Please call emergency services immediately.";

    var smsURI =
      "sms:" +
      phoneNumber +
      "?body=" +
      encodeURIComponent(message);

    window.location.href = smsURI;
  }

  window.addEventListener(
    "online",
    function () {
      isOnline = true;

      updateOfflineBanner();

      cacheEmergencyServices();

      setTimeout(syncQueue, 1500);
    }
  );

  window.addEventListener(
    "offline",
    function () {
      isOnline = false;

      updateOfflineBanner();
    }
  );

  function patchFetch() {
    var originalFetch = window.fetch;

    window.fetch = async function (
      url,
      options
    ) {
      if (
        !isOnline &&
        typeof url === "string" &&
        url.includes(SOS_API)
      ) {
        var payload = {};

        try {
          payload = JSON.parse(
            (options && options.body) ||
              "{}"
          );
        } catch (_) {}

        await queueSOS(payload);

        throw new Error(
          "Offline — SOS queued locally"
        );
      }

      return originalFetch.apply(
        this,
        arguments
      );
    };
  }

  window.OfflineSOS = {
    queue: queueSOS,

    sync: syncQueue,

    isOnline: function () {
      return isOnline;
    },

    getQueueCount: getQueueCount,

    getCachedContacts:
      getCachedContacts,

    sendSMSFallback: function () {
      var lastPayload = null;

      try {
        var q = JSON.parse(
          localStorage.getItem(LS_KEY) ||
            "[]"
        );

        if (q.length > 0) {
          lastPayload =
            q[q.length - 1];
        }

      } catch (_) {}

      basicSMSFallback(
        lastPayload || {
          userId:
            localStorage.getItem(
              "userId"
            ) || "guest",
          latitude: null,
          longitude: null,
        }
      );
    },

    clearQueue: function () {
      localStorage.removeItem(
        LS_KEY
      );
    },
  };

  async function init() {
    injectOfflineBannerStyles();

    createOfflineBanner();

    await initDB();

    patchFetch();

    if (!isOnline) {
      updateOfflineBanner();
    }

    if (isOnline) {
      cacheEmergencyServices();

      var pending = getQueueCount();

      if (pending > 0) {
        syncQueue();
      }
    }
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