// File: app-core.js

let saveTimeout = null;
let clockInterval = null;
let lucideTimeout = null;
let modalStack = [];

window.addEventListener("beforeunload", () => {
  if (clockInterval) clearInterval(clockInterval);

  // PERBAIKAN: Paksa simpan data secara sinkron sebelum browser ditutup
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    if (typeof appState !== "undefined" && appState.attendanceData) {
      localStorage.setItem(
        APP_CONFIG.storageKey,
        JSON.stringify(appState.attendanceData),
      );
    }
  }

  if (lucideTimeout) clearTimeout(lucideTimeout);
});

// ==========================================
// CONFIG & CONSTANTS
// ==========================================
const APP_CONFIG = {
  storageKey: "musyrif_app_v5_fix",
  permitKey: "musyrif_permits_db",
  pinDefault: 1234,
  activityLogKey: "musyrif_activity_log",
  settingsKey: "musyrif_settings",
  googleAuthKey: "musyrif_google_session",
  googleClientId: window.APP_CREDENTIALS.googleClientId,
};

// ==========================================
// KONFIGURASI LOKASI (GEOFENCING)
// ==========================================

const GPS_CACHE_KEY = "presensi_gps_cache";

const GPS_CACHE_DURATION = 15 * 60 * 1000; // 15 menit

const GEO_CONFIG = window.GEO_CONFIG || {
  useGeofencing: false,
  maxRadiusMeters: 100,
  locations: [],
};

const UI_COLORS = {
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

window.sanitizeHTML = function (str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.textContent; // Return text, NOT innerHTML
};

window.refreshIcons = function () {
  clearTimeout(lucideTimeout);
  lucideTimeout = setTimeout(() => {
    if (window.lucide) {
      try {
        window.lucide.createIcons();
      } catch (e) {
        console.warn("Lucide render error:", e);
      }
    }
  }, 150);
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

window.parseJwt = function (token) {
  var base64Url = token.split(".")[1];
  var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  var jsonPayload = decodeURIComponent(
    window
      .atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join(""),
  );
  return JSON.parse(jsonPayload);
};

// Helper Tanggal yang Aman (Local Time YYYY-MM-DD)
window.getLocalDateStr = function (dateObj = new Date()) {
  try {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("Date conversion error:", e);
    return new Date().toISOString().split("T")[0];
  }
};

// Format tanggal ke "Senin, 1 Jan 2025"
window.formatDate = function (dateStr) {
  if (!dateStr) return "-";
  const days = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Ags",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  const d = new Date(dateStr + "T12:00:00");
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Cek apakah tanggal Masehi (YYYY-MM-DD) jatuh di bulan Ramadhan (Hijriyah ke-9)
window.isRamadhan = function (dateStr) {
  try {
    const d = new Date(dateStr + "T12:00:00");
    // Gunakan Intl.DateTimeFormat untuk mendapatkan bulan Hijriyah
    const hijriMonth = new Intl.DateTimeFormat("id-ID-u-ca-islamic", {
      month: "numeric",
    }).format(d);
    return Number(hijriMonth) === 9;
  } catch (e) {
    return false;
  }
};

// Polyfill Canvas roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (
    x,
    y,
    width,
    height,
    radii,
  ) {
    const radius = Array.isArray(radii) ? radii[0] : radii;
    this.beginPath();
    this.moveTo(x + radius, y);
    this.lineTo(x + width - radius, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.lineTo(x + width, y + height - radius);
    this.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height,
    );
    this.lineTo(x + radius, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
    return this;
  };
}

// ==========================================
// STATE MANAGEMENT
// ==========================================
let appState = {
  selectedClass: null,
  currentSlotId: "shubuh",
  attendanceData: {},
  holidays: [],
  searchQuery: "",
  analysisMode: "daily", // daily, weekly, monthly, semester
  reportMode: "daily", // daily, weekly, monthly, semester, yearly <-- BARU
  analysisSantriId: null,
  filterProblemOnly: false,
  date: window.getLocalDateStr(),
  timesheetViewDate: window.getLocalDateStr(),
  activityLog: [],
  settings: {
    darkMode: false,
    notifications: true,
    autoSave: true,
  },
};

if (!appState.holidays || appState.holidays.length === 0) {
  appState.holidays = [
    {
      id: "holiday1",
      title: "Tahsin Libur",
      type: "activity",
      date: "2026-06-09",
      activityId: "vocabularies",
    },
  ];
}

// DATA STORE
let MASTER_SANTRI = [];
let MASTER_KELAS = {};
let FILTERED_SANTRI = [];

// ==========================================
// SLOT & STATUS CONFIGURATION (UPDATED)
// ==========================================
const SLOT_WAKTU = window.SLOT_WAKTU || {};

const STATUS_UI = {
  Hadir: {
    class: "bg-emerald-500 text-white border-emerald-500",
    label: "H",
  },
  Ya: {
    class: "bg-emerald-500 text-white border-emerald-500",
    label: "Y",
  },
  Telat: {
    class:
      "bg-emerald-100 text-emerald-500 border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-500 dark:border-emerald-500",
    label: "T",
  },
  Izin: {
    class:
      "bg-blue-100 text-blue-500 border-blue-500 dark:bg-blue-900/30 dark:text-blue-500 dark:border-blue-500",
    label: "I",
  },
  Sakit: {
    class:
      "bg-amber-100 text-amber-500 border-amber-500 dark:bg-amber-900/30 dark:text-amber-500 dark:border-amber-500",
    label: "S",
  },
  Alpa: {
    class:
      "bg-red-100 text-red-500 border-red-500 dark:bg-red-900/30 dark:text-red-500 dark:border-red-500",
    label: "A",
  },
  Pulang: {
    class:
      "bg-purple-100 text-purple-500 border-purple-500 dark:bg-purple-900/30 dark:text-purple-500 dark:border-purple-500",
    label: "P",
  },
  Tidak: {
    class:
      "bg-slate-100 text-slate-400 border-slate-400 dark:bg-slate-700 dark:text-slate-500 dark:border-slate-500",
    label: "-",
  },
};

// Tambahkan 'kemarin': 0 agar logika matematika berjalan
const SESSION_ORDER = {
  kemarin: 0,
  shubuh: 1,
  sekolah: 2,
  ashar: 3,
  maghrib: 4,
  isya: 5,
};

// ==========================================
// KONFIGURASI PEMBINAAN (Disciplinary Rules)
// ==========================================
const PEMBINAAN_RULES = [
  {
    min: 1,
    max: 10,
    level: 1,
    label: "Bimbingan Musyrif",
    action: "Lembar Pembinaan",
    color: "text-yellow-600 bg-yellow-100 border-yellow-200",
  },
  {
    min: 11,
    max: 20,
    level: 2,
    label: "SP1 - Pamong",
    action: "Surat Pernyataan I",
    color: "text-orange-600 bg-orange-100 border-orange-200",
  },
  {
    min: 21,
    max: 30,
    level: 3,
    label: "SP2 - SU. KIS",
    action: "Panggil Ortu & SP II",
    color: "text-orange-700 bg-orange-200 border-orange-300",
  },
  {
    min: 31,
    max: 40,
    level: 4,
    label: "SP3 - Wadir IV",
    action: "Panggil Ortu & SP III",
    color: "text-red-600 bg-red-100 border-red-200",
  },
  {
    min: 41,
    max: 999,
    level: 5,
    label: "Direktur - SPT",
    action: "Surat Pernyataan Terakhir/Keluar",
    color: "text-white bg-red-600 border-red-700",
  },
];

// Helper: Hitung Total Alpa Santri


// Helper: Tentukan Status Pembinaan
window.getPembinaanStatus = function (alpaCount) {
  if (alpaCount === 0) return null;
  return (
    PEMBINAAN_RULES.find((r) => alpaCount >= r.min && alpaCount <= r.max) ||
    PEMBINAAN_RULES[PEMBINAAN_RULES.length - 1]
  );
};

window.getCachedLocation = function () {
  try {
    const cache = JSON.parse(localStorage.getItem(GPS_CACHE_KEY));

    if (!cache) return null;

    const age = Date.now() - cache.timestamp;

    if (age > GPS_CACHE_DURATION) {
      return null;
    }

    return cache;
  } catch {
    return null;
  }
};


// ==========================================
// CORE UTILITIES & CALCULATIONS (REFACTORED)
// ==========================================

// ==========================================
// 4. LOGIC PERHITUNGAN (REFACTORED)
// ==========================================

window.isHoliday = function (
  dateStr,
  slotId = null,
  activityId = null,
  category = null,
) {
  const holidays = appState.holidays || [];
  return (
    holidays.find((h) => {
      if (h.date !== dateStr) return false;
      if (h.type === "activity" && activityId) {
        return h.activityId === activityId;
      }
      if (h.type === "slot" && slotId) {
        return h.slotId === slotId;
      }
      if (h.type === "category" && category) {
        return h.category === category;
      }
      return false;
    }) || null
  );
};

window.isActivityHoliday = function (dateStr, slotId, activityId) {
  return !!window.isHoliday(dateStr, slotId, activityId);
};

window.isCategoryHoliday = function (dateStr, category) {
  return !!window.isHoliday(dateStr, null, null, category);
};

window.isSlotHoliday = function (slotId, dateStr) {
  const slotHoliday = window.isHoliday(dateStr, slotId);
  if (slotHoliday) {
    return true;
  }
  const dayNum = new Date(dateStr).getDay();
  const slotConfig = SLOT_WAKTU[slotId];
  if (!slotConfig || !slotConfig.activities) {
    return true;
  }
  const activeActs = slotConfig.activities.filter((act) => {
    if (window.isActivityHoliday(dateStr, slotId, act.id)) {
      return false;
    }
    if (window.isCategoryHoliday(dateStr, act.category)) {
      return false;
    }
    if (act.showOnDays && !act.showOnDays.includes(dayNum)) return false;
    if (act.onlyRamadhan && !window.isRamadhan(dateStr)) return false;
    return true;
  });
  return activeActs.length === 0;
};

window.calculateSlotStats = function (slotId, customDate = null) {
  const stats = {
    h: 0,
    t: 0,
    i: 0,
    s: 0,
    p: 0,
    a: 0,
    total: 0,
    isFilled: false,
  };

  // Cegah error jika data santri belum siap
  if (!FILTERED_SANTRI || FILTERED_SANTRI.length === 0) return stats;

  const dateKey = customDate || appState.date;

  // JIKA LIBUR, otomatis kembalikan angka 0 (Progress Bar akan kosong/aman)
  if (window.isSlotHoliday(slotId, dateKey)) return stats;

  const slotData = appState.attendanceData[dateKey]?.[slotId];
  if (!slotData) return stats;

  const dayNum = new Date(dateKey).getDay();
  const slotConfig = SLOT_WAKTU[slotId];

  const mainAct = slotConfig.activities.find((act) => {
    if (act.showOnDays && !act.showOnDays.includes(dayNum)) return false;
    if (act.onlyRamadhan && !window.isRamadhan(dateKey)) return false;
    if (window.isActivityHoliday(dateKey, slotId, act.id)) {
      return false;
    }

    if (window.isCategoryHoliday(dateKey, act.category)) {
      return false;
    }
    return true;
  });

  if (!mainAct) return stats;

  // Hitung spesifik untuk santri yang sedang difilter saja (mencegah progress > 100%)
  FILTERED_SANTRI.forEach((s) => {
    const id = String(s.nis || s.id);
    const status = slotData[id]?.status?.[mainAct.id];

    if (status) {
      stats.isFilled = true;
      if (status === "Hadir") stats.h++;
      else if (status === "Telat") stats.t++;
      else if (status === "Izin") stats.i++;
      else if (status === "Sakit") stats.s++;
      else if (status === "Pulang") stats.p++;
      else if (status === "Alpa") stats.a++;
      stats.total++; // Ini jumlah anak yang SUDAH diabsen
    }
  });

  return stats;
};

window.getSlotCompletionStatus = function (slotId, dateStr) {
  const slotData = appState.attendanceData?.[dateStr]?.[slotId];

  if (!slotData) {
    return {
      total: 0,
      filled: 0,
      complete: false,
    };
  }

  let totalSantri = 0;
  let filledSantri = 0;

  FILTERED_SANTRI.forEach((s) => {
    const id = String(s.nis || s.id);

    totalSantri++;

    const status = window.getAttendanceStatus(id, slotId, dateStr);

    if (status) {
      filledSantri++;
    }
  });

  return {
    total: totalSantri,
    filled: filledSantri,
    complete: filledSantri === totalSantri,
  };
};

window.getAttendanceStatus = function (santriId, slotId, customDate = null) {
  try {
    const dateKey = customDate || appState.date;

    const slotData = appState.attendanceData?.[dateKey]?.[slotId];

    if (!slotData) return null;

    const dayNum = new Date(dateKey).getDay();

    const slotConfig = SLOT_WAKTU[slotId];

    if (!slotConfig) return null;

    const mainAct = slotConfig.activities.find((act) => {
      if (act.showOnDays && !act.showOnDays.includes(dayNum)) return false;

      if (act.onlyRamadhan && !window.isRamadhan(dateKey)) return false;

      return true;
    });

    if (!mainAct) return null;

    const id = String(santriId);

    return slotData[id]?.status?.[mainAct.id] || null;
  } catch (err) {
    console.error("getAttendanceStatus error:", err);
    return null;
  }
};




window.saveData = function () {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const dataStr = JSON.stringify(appState.attendanceData);

      // Check localStorage quota (iOS Safari limit ~5MB)
      if (dataStr.length > window.APP_CONSTANTS.maxStorageBytes) {
        console.warn("Data mendekati batas storage!");
        window.showToast("Data hampir penuh. Pertimbangkan export.", "warning");
      }

      localStorage.setItem(APP_CONFIG.storageKey, dataStr);

      if (appState.settings.autoSave) {
        const indicator = document.getElementById("save-indicator");
        if (indicator) {
          indicator.innerHTML =
            '<i data-lucide="check" class="w-5 h-5 text-emerald-500"></i>';
          window.refreshIcons();
          setTimeout(() => (indicator.innerHTML = ""), 1000);
        }
      }
    } catch (e) {
      if (e.name === "QuotaExceededError") {
        window.showToast("Storage penuh! Hapus data lama.", "error");
      } else {
        window.showToast("Gagal menyimpan: " + e.message, "error");
      }
      console.error("Save error:", e);
    }
  }, 500); // Increased debounce for better batching
};




window.getDayCompletionStatus = function (dateStr) {
  let requiredSlots = 0;
  let completedSlots = 0;

  Object.values(SLOT_WAKTU).forEach((slot) => {
    if (window.isSlotHoliday(slot.id, dateStr)) {
      return;
    }

    requiredSlots++;

    const completion = window.getSlotCompletionStatus(slot.id, dateStr);

    if (completion.complete) {
      completedSlots++;
    }
  });

  return {
    requiredSlots,
    completedSlots,
    complete: requiredSlots > 0 && completedSlots >= requiredSlots,
  };
};
