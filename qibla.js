// File: qibla.js
// Logika Kompas Kiblat Interaktif untuk Musyrif App

window.qiblaAngle = null;
window.qiblaDistance = null;
window.deviceHeading = null;
window.orientationListenerActive = false;

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

// Main function to open and init Qibla Modal
window.openQiblaModal = function () {
  const modal = document.getElementById("modal-qibla");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  
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
        document.getElementById("qibla-angle-txt").textContent = Math.round(window.qiblaAngle) + "°";
        document.getElementById("qibla-distance-txt").textContent = Math.round(window.qiblaDistance).toLocaleString("id-ID") + " km";

        document.getElementById("qibla-loading").classList.add("hidden");
        document.getElementById("qibla-content-wrapper").classList.remove("hidden");

        // Request Compass/Orientation permission
        window.initCompass();
      },
      (error) => {
        console.error("GPS error for Qibla:", error);
        // Fallback using average coordinates of Yogyakarta/Indonesia if GPS fails
        const fallbackLat = -7.801389; 
        const fallbackLng = 110.364444;

        window.qiblaAngle = window.calculateQiblaBearing(fallbackLat, fallbackLng);
        window.qiblaDistance = window.calculateQiblaDistance(fallbackLat, fallbackLng);

        document.getElementById("qibla-angle-txt").textContent = Math.round(window.qiblaAngle) + "° (Perkiraan)";
        document.getElementById("qibla-distance-txt").textContent = Math.round(window.qiblaDistance).toLocaleString("id-ID") + " km";

        document.getElementById("qibla-loading").classList.add("hidden");
        document.getElementById("qibla-content-wrapper").classList.remove("hidden");
        
        window.initCompass();
        window.showToast("Gagal GPS. Menggunakan estimasi koordinat regional.", "info");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  } else {
    window.showToast("Browser Anda tidak mendukung GPS.", "error");
  }
};

window.closeQiblaModal = function () {
  const modal = document.getElementById("modal-qibla");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
  window.stopCompassListener();
};

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

  if (!compassDial || !qiblaArrow || window.qiblaAngle === null) return;

  // Round heading
  const roundedHeading = Math.round(heading);
  if (headingTxt) headingTxt.textContent = roundedHeading + "° " + window.getCompassDirectionName(roundedHeading);

  // Compass Dial rotates inverse of heading so North stays North
  compassDial.style.transform = `rotate(${-heading}deg)`;

  // Compass needle rotates relative to device: qiblaAngle - heading
  const relativeAngle = (window.qiblaAngle - heading + 360) % 360;
  qiblaArrow.style.transform = `rotate(${relativeAngle}deg)`;

  // If phone is pointing to Qibla (within ±4 degrees)
  const diff = Math.min(Math.abs(relativeAngle), 360 - Math.abs(relativeAngle));
  if (diff <= 4) {
    qiblaArrow.classList.add("qibla-active");
    alignmentIndicator.classList.add("qibla-aligned");
    alignmentIndicator.textContent = "TERARAH KE KAKBAH";

    // Trigger haptic vibrate feedback on Android (max once every 1 second to not annoy user)
    if (navigator.vibrate && Date.now() - lastVibrateTime > 1000) {
      navigator.vibrate(80);
      lastVibrateTime = Date.now();
    }
  } else {
    qiblaArrow.classList.remove("qibla-active");
    alignmentIndicator.classList.remove("qibla-aligned");
    alignmentIndicator.textContent = "PUTAR PONSEL ANDA";
  }
};

// Convert degrees to cardinal direction name
window.getCompassDirectionName = function (deg) {
  const directions = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
  const index = Math.round(((deg % 360) / 45)) % 8;
  return directions[index];
};
