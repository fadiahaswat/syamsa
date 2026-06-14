// File: qibla.js
// Logika Kompas Kiblat Interaktif untuk Musyrif App

window.qiblaAngle = null;
window.qiblaDistance = null;
window.deviceHeading = null;
window.orientationListenerActive = false;
window.qiblaLocked = false;

// Lokasi Kakbah Makkah
const MECCA_LAT = 21.422487;
const MECCA_LNG = 39.826206;

// Fungsi hitung sudut arah kiblat (Bearing)
window.calculateQiblaBearing = function (lat, lng) {
  const phi1 = lat * Math.PI / 180;
  const phi2 = MECCA_LAT * Math.PI / 180;
  const lambda1 = lng * Math.PI / 180;
  const lambda2 = MECCA_LNG * Math.PI / 180;
  const dLng = lambda2 - lambda1;

  const y = Math.sin(dLng);
  const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(dLng);
  const qiblaRad = Math.atan2(y, x);
  const qiblaDeg = (qiblaRad * 180 / Math.PI + 360) % 360;
  return qiblaDeg;
};

// Fungsi hitung jarak ke Kakbah (Haversine Formula)
window.calculateQiblaDistance = function (lat, lng) {
  const R = 6371; // Radius bumi dalam km
  const dLat = (MECCA_LAT - lat) * Math.PI / 180;
  const dLng = (MECCA_LNG - lng) * Math.PI / 180;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat * Math.PI / 180) * Math.cos(MECCA_LAT * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Main function to open and init Qibla Page
window.openQiblaPage = function () {
  const viewMain = document.getElementById("view-main");
  const viewQibla = document.getElementById("view-qibla");
  if (!viewQibla) return;

  window.qiblaLocked = false;
  window.preparePrecisionQiblaUI();
  window.setQiblaPrecisionState("searching");
  viewQibla.classList.remove("hidden");
  viewQibla.classList.add("flex");
  viewQibla.scrollTop = 0;
  if (window.lucide) window.lucide.createIcons();
  setTimeout(() => {
    if (viewMain) viewMain.classList.add("hidden");
  }, 250);
  
  // Show GPS loading
  document.getElementById("qibla-loading").classList.remove("hidden");
  document.getElementById("qibla-content-wrapper").classList.add("hidden");
  document.getElementById("qibla-sensor-permission-btn").classList.add("hidden");

  // Get current position
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        window.qiblaAngle = window.calculateQiblaBearing(lat, lng);
        window.qiblaDistance = window.calculateQiblaDistance(lat, lng);

        // Update UI
        document.getElementById("qibla-angle-txt").textContent = Math.round(window.qiblaAngle) + "\u00b0";
        document.getElementById("qibla-distance-txt").textContent = Math.round(window.qiblaDistance).toLocaleString("id-ID") + " km";

        document.getElementById("qibla-loading").classList.add("hidden");
        document.getElementById("qibla-content-wrapper").classList.remove("hidden");
        window.setQiblaPrecisionState("calibrating");

        // Request Compass/Orientation permission
        window.initCompass();
      },
      (error) => {
        console.error("GPS error for Qibla:", error);
        const fallbackLocation = window.APP_LOCATION?.qiblaFallbackLocation || {
          lat: -7.801389,
          lng: 110.364444,
        };
        const fallbackLat = fallbackLocation.lat;
        const fallbackLng = fallbackLocation.lng;

        window.qiblaAngle = window.calculateQiblaBearing(fallbackLat, fallbackLng);
        window.qiblaDistance = window.calculateQiblaDistance(fallbackLat, fallbackLng);

        document.getElementById("qibla-angle-txt").textContent = Math.round(window.qiblaAngle) + "\u00b0 (Perkiraan)";
        document.getElementById("qibla-distance-txt").textContent = Math.round(window.qiblaDistance).toLocaleString("id-ID") + " km";

        document.getElementById("qibla-loading").classList.add("hidden");
        document.getElementById("qibla-content-wrapper").classList.remove("hidden");
        window.setQiblaPrecisionState("calibrating");
        
        window.initCompass();
        window.showToast("Gagal GPS. Menggunakan estimasi koordinat regional.", "info");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  } else {
    window.showToast("Browser Anda tidak mendukung GPS.", "error");
  }
};

window.closeQiblaPage = function () {
  const viewMain = document.getElementById("view-main");
  const viewQibla = document.getElementById("view-qibla");
  if (viewMain) viewMain.classList.remove("hidden");
  if (viewQibla) {
    viewQibla.classList.add("hidden");
    viewQibla.classList.remove("flex");
  }
  window.stopCompassListener();
};

window.preparePrecisionQiblaUI = function () {
  const viewQibla = document.getElementById("view-qibla");
  const qiblaNeedle = document.getElementById("qibla-needle");
  const wrapper = document.querySelector("#view-qibla > div");
  if (!viewQibla || !wrapper) return;

  const headerLabel = viewQibla.querySelector("header p");
  const headerTitle = viewQibla.querySelector("header h3");
  if (headerLabel) headerLabel.textContent = "Finding";
  if (headerTitle) headerTitle.textContent = "Cari Kiblat";

  if (qiblaNeedle && !qiblaNeedle.dataset.precisionReady) {
    qiblaNeedle.innerHTML = `
      <svg viewBox="0 0 180 180" aria-hidden="true">
        <path d="M43 104.5 104.5 43c7.6-7.6 20.5-2.2 20.5 8.6v50.8c0 12.5-10.1 22.6-22.6 22.6H51.6c-10.8 0-16.2-12.9-8.6-20.5Z" fill="currentColor"></path>
        <path d="M119 43v43.5H75.5" fill="none" stroke="currentColor" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;
    qiblaNeedle.dataset.precisionReady = "true";
  }

  if (!document.getElementById("qibla-bottom-actions")) {
    const actions = document.createElement("div");
    actions.id = "qibla-bottom-actions";
    actions.className = "qibla-bottom-actions";
    actions.innerHTML = `
      <button type="button" onclick="window.closeQiblaPage()" aria-label="Tutup"><i data-lucide="x"></i></button>
      <button type="button" aria-label="Suara"><i data-lucide="volume-2"></i></button>
    `;
    wrapper.appendChild(actions);
  }
};

window.setQiblaPrecisionState = function (state, diff = null, directionText = "") {
  const viewQibla = document.getElementById("view-qibla");
  const loading = document.getElementById("qibla-loading");
  const content = document.getElementById("qibla-content-wrapper");
  const title = viewQibla?.querySelector("header h3");
  const subtitle = viewQibla?.querySelector("header p");
  const angleTxt = document.getElementById("qibla-angle-txt");
  const indicator = document.getElementById("qibla-alignment-indicator");
  const arrow = document.getElementById("qibla-needle");
  if (!viewQibla) return;

  viewQibla.dataset.qiblaState = state;
  if (subtitle) subtitle.textContent = "Finding";
  if (loading) loading.classList.toggle("hidden", state !== "searching");
  if (content) content.classList.toggle("hidden", state === "searching");

  const roundedDiff = diff === null ? null : Math.round(diff);
  if (state === "searching") {
    if (title) title.textContent = "Cari Kiblat";
    if (indicator) indicator.textContent = "Menentukan arah kiblat...";
    return;
  }
  if (state === "calibrating") {
    if (title) title.textContent = "Kalibrasi Kompas";
    if (angleTxt) angleTxt.textContent = "\u221e";
    if (indicator) indicator.textContent = "Gerakkan perangkat membentuk angka 8";
    if (arrow) arrow.style.opacity = "0";
    return;
  }
  if (arrow) arrow.style.opacity = "";
  if (state === "perfect") {
    if (title) title.textContent = "Kiblat Ditemukan";
    if (angleTxt) angleTxt.textContent = "";
    if (indicator) indicator.textContent = "Siap Shalat";
    return;
  }
  if (state === "locked") {
    if (title) title.textContent = "Arah Kiblat Terkunci";
    if (angleTxt) angleTxt.textContent = Math.round(window.qiblaAngle || 0) + "\u00b0";
    if (indicator) indicator.textContent = "Siap digunakan saat shalat";
    return;
  }

  if (title) title.textContent = state === "almost" ? "Hampir Tepat" : "Cari Kiblat";
  if (angleTxt && roundedDiff !== null) angleTxt.textContent = `${roundedDiff}\u00b0`;
  if (indicator) indicator.textContent = state === "far" ? directionText : `${roundedDiff}\u00b0 lagi`;
};

window.openQiblaModal = window.openQiblaPage;
window.closeQiblaModal = window.closeQiblaPage;

// Initialize Compass Sensor
window.initCompass = function () {
  // Check if iOS permissions are required
  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
    // Show iOS Izin button
    document.getElementById("qibla-sensor-permission-btn").classList.remove("hidden");
  } else {
    // Android or desktop - listen directly
    window.startCompassListener();
  }
};

// Handle iOS permission request click
window.requestQiblaSensorPermission = async function () {
  try {
    const permission = await DeviceOrientationEvent.requestPermission();
    if (permission === "granted") {
      document.getElementById("qibla-sensor-permission-btn").classList.add("hidden");
      window.startCompassListener();
    } else {
      window.showToast("Izin sensor ditolak. Kompas tidak dapat berputar.", "warning");
    }
  } catch (error) {
    console.error("Error requesting compass permission:", error);
  }
};

// Start device orientation listener
window.startCompassListener = function () {
  if (window.orientationListenerActive) return;

  const onOrientation = (event) => {
    let heading = null;

    if (event.webkitCompassHeading !== undefined) {
      heading = event.webkitCompassHeading; // iOS absolute heading
    } else if (event.alpha !== null) {
      // Android alpha: z-axis rotation. Usually absolute if absolute event is used.
      heading = (360 - event.alpha) % 360;
    }

    if (heading !== null) {
      window.deviceHeading = heading;
      window.updateCompassUI(heading);
    }
  };

  // Use absolute orientation event on Android/Chrome to avoid compass drift
  if ("ondeviceorientationabsolute" in window) {
    window.addEventListener("deviceorientationabsolute", onOrientation);
    window.activeOrientationEvent = "deviceorientationabsolute";
  } else {
    window.addEventListener("deviceorientation", onOrientation);
    window.activeOrientationEvent = "deviceorientation";
  }
  window.activeOrientationCallback = onOrientation;
  window.orientationListenerActive = true;
};

// Stop listening
window.stopCompassListener = function () {
  if (window.orientationListenerActive && window.activeOrientationCallback) {
    window.removeEventListener(window.activeOrientationEvent, window.activeOrientationCallback);
    window.orientationListenerActive = false;
  }
};

// Update Compass rotation & alignment styles in real-time
let lastVibrateTime = 0;
window.updateCompassUI = function (heading) {
  const compassDial = document.getElementById("qibla-compass-dial");
  const qiblaArrow = document.getElementById("qibla-needle");
  const headingTxt = document.getElementById("qibla-current-heading-txt");
  const alignmentIndicator = document.getElementById("qibla-alignment-indicator");

  if (!qiblaArrow || window.qiblaAngle === null) return;

  // Round heading
  const roundedHeading = Math.round(heading);
  if (headingTxt) headingTxt.textContent = roundedHeading + "\u00b0 " + window.getCompassDirectionName(roundedHeading);

  // Compass Dial rotates inverse of heading so North stays North
  if (compassDial) compassDial.style.transform = `rotate(${-heading}deg)`;

  // Compass needle rotates relative to device: qiblaAngle - heading
  const signedDiff = ((window.qiblaAngle - heading + 540) % 360) - 180;
  const diff = Math.abs(signedDiff);
  const directionText = signedDiff > 0 ? "ke kanan" : "ke kiri";
  qiblaArrow.style.transform = `rotate(${signedDiff}deg)`;

  // If phone is pointing to Qibla (within ±4 degrees)
  if (diff <= 4) {
    qiblaArrow.classList.add("qibla-active");
    if (alignmentIndicator) alignmentIndicator.classList.add("qibla-aligned");
    window.setQiblaPrecisionState(diff <= 1 ? "perfect" : "almost", diff, directionText);
    if (diff <= 1 && !window.qiblaLocked) {
      window.qiblaLocked = true;
      setTimeout(() => {
        if (document.getElementById("view-qibla")?.dataset.qiblaState === "perfect") {
          window.setQiblaPrecisionState("locked", diff, directionText);
        }
      }, 1800);
    }

    // Trigger haptic vibrate feedback on Android (max once every 1 second to not annoy user)
    if (navigator.vibrate && Date.now() - lastVibrateTime > 1000) {
      navigator.vibrate(80);
      lastVibrateTime = Date.now();
    }
  } else {
    window.qiblaLocked = false;
    qiblaArrow.classList.remove("qibla-active");
    if (alignmentIndicator) alignmentIndicator.classList.remove("qibla-aligned");
    window.setQiblaPrecisionState(diff <= 15 ? "closer" : "far", diff, directionText);
  }
};

// Convert degrees to cardinal direction name
window.getCompassDirectionName = function (deg) {
  const directions = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
  const index = Math.round(((deg % 360) / 45)) % 8;
  return directions[index];
};
