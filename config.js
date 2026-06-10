// File: config.js
// Konfigurasi terpusat — edit file ini untuk menyesuaikan deployment.

// ==========================================
// KREDENSIAL & URL EKSTERNAL
// ==========================================
window.APP_CREDENTIALS = {
  // Google Apps Script (sumber data Santri & Kelas — URL yang sama)
  googleSheetUrl:
    "https://script.google.com/macros/s/AKfycbw-URYAsLTWCdnGurQhM1ZXa9N8vm-GBlHwtetDlin73-Ma8G0aAbFoboGGUI8GgVDl/exec",

  // Google OAuth Client ID (untuk login Musyrif)
  googleClientId:
    "694043281368-cqf9tji9rsv2k2gtfu7pbicdsc1gcvk7.apps.googleusercontent.com",
};

// ==========================================
// MODE AUTENTIKASI
// ==========================================
window.APP_AUTH = {
  // 'production' = PIN + Google OAuth
  // 'testing' = PIN + Direct Login (tanpa Google)
  loginMode: "production",
  allowTestingMode: true,

  // Akun khusus pengujian (password hash SHA-256 hex) — hanya untuk non-produksi
  // Contoh generate hash: echo -n "password-anda" | shasum -a 256
  // Catatan: kelas harus sesuai kelas yang valid di data-kelas
  testingAccounts: [
    {
      username: "tester-musyrif",
      kelas: "XI-A",
      passwordHash:
        "b822f1cd2dcfc685b47e83e3980289fd5d8e3ff3a82def24d7d1d68bb272eb32",
    },
  ],
};

// ==========================================
// KONSTANTA APLIKASI (MAGIC NUMBERS)
// ==========================================
window.APP_CONSTANTS = {
  // Kunci localStorage untuk PIN Musyrif
  pinKey: "musyrif_pin",

  // Batas ukuran data sebelum peringatan storage penuh (~4.5 MB)
  maxStorageBytes: 4500000,

  // Batas maksimal entri log aktivitas yang disimpan
  maxActivityLogEntries: 50,

  // Berapa hari ke belakang data presensi masih bisa diedit
  maxEditDaysBack: 3,

  // Timeout (ms) untuk load data dari server saat startup
  dataLoadTimeoutMs: 8000,

  // Durasi cache data santri sebelum diperbarui dari server (24 jam)
  santriCacheExpiryMs: 24 * 60 * 60 * 1000,
};

// ==========================================
// KONFIGURASI LOKASI (GEOFENCING)
// ==========================================
window.GEO_CONFIG = {
  useGeofencing: true, // Set ke false jika ingin mematikan fitur ini sementara
  maxRadiusMeters: 100, // Radius toleransi dalam meter (misal: 50 meter)
  locations: [
    {
      name: "Masjid Jami' Mu'allimin",
      lat: -7.807757309250455,
      lng: 110.35091531948025,
    },
    {
      name: "Aula Asrama 10",
      lat: -7.807645469455366,
      lng: 110.35180282962452,
    },
    {
      name: "Mushola Asrama 8",
      lat: -7.806781091907755,
      lng: 110.34871697299599,
    },
    {
      name: "Masjid Hajah Yuliana",
      lat: -7.807337010430911,
      lng: 110.26653812830205,
    },
    {
      name: "Kantor Muhammadiyah Supeno",
      lat: -7.8163746365704725,
      lng: 110.37986454893164,
    },
  ],
};

// ==========================================
// KONFIGURASI SLOT WAKTU & AKTIVITAS (JADWAL HARIAN)
// ==========================================
window.SLOT_WAKTU = {
  shubuh: {
    id: "shubuh",
    label: "Shubuh",
    subLabel: "04:00 - 06:00",
    theme: "emerald",
    startHour: 4,
    style: {
      icon: "sunrise",
      progressBg: "bg-emerald-500",
      gradient:
        "from-emerald-50 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/20",
      border: "hover:border-emerald-300 dark:hover:border-emerald-700",
      text: "text-emerald-700 dark:text-emerald-300",
      iconBg:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-200",
    },
    activities: [
      { id: "shalat", label: "Shubuh", type: "mandator", category: "fardu" },
      {
        id: "qabliyah",
        label: "Qabliyah",
        type: "sunnah",
        category: "dependent",
      },
      {
        id: "dzikir_pagi",
        label: "Dzikir",
        type: "sunnah",
        category: "dependent",
      },
      {
        id: "tahfizh",
        label: "Tahfizh",
        type: "mandator",
        category: "kbm",
        showOnDays: [1, 2, 3, 4, 5, 6],
      },
      { id: "tahajjud", label: "Tahajjud", type: "sunnah", category: "sunnah" },
      {
        id: "conversation",
        label: "Conver",
        type: "mandator",
        category: "kbm",
        showOnDays: [0],
      },
    ],
  },
  sekolah: {
    id: "sekolah",
    label: "Sekolah",
    subLabel: "06:00 - 15:00",
    theme: "cyan",
    startHour: 6,
    style: {
      icon: "graduation-cap",
      progressBg: "bg-cyan-500",
      gradient:
        "from-cyan-50 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/20",
      border: "hover:border-cyan-300 dark:hover:border-cyan-700",
      text: "text-cyan-700 dark:text-cyan-300",
      iconBg: "bg-cyan-100 text-cyan-600 dark:bg-cyan-800 dark:text-cyan-200",
    },
    activities: [
      {
        id: "kbm_sekolah",
        label: "KBM Sekolah",
        type: "mandator",
        category: "school",
        showOnDays: [1, 2, 3, 4, 5, 6],
      },
    ],
  },
  ashar: {
    id: "ashar",
    label: "Ashar",
    subLabel: "15:00 - 17:00",
    theme: "orange",
    startHour: 15,
    style: {
      icon: "sun",
      progressBg: "bg-orange-500",
      gradient:
        "from-orange-50 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/20",
      border: "hover:border-orange-300 dark:hover:border-orange-700",
      text: "text-orange-700 dark:text-orange-300",
      iconBg:
        "bg-orange-100 text-orange-600 dark:bg-orange-800 dark:text-orange-200",
    },
    activities: [
      { id: "shalat", label: "Ashar", type: "mandator", category: "fardu" },
      {
        id: "dzikir_petang",
        label: "Dzikir",
        type: "sunnah",
        category: "dependent",
      },
    ],
  },
  maghrib: {
    id: "maghrib",
    label: "Maghrib",
    subLabel: "18:00 - 19:00",
    theme: "indigo",
    startHour: 18,
    style: {
      icon: "sunset",
      progressBg: "bg-indigo-500",
      gradient:
        "from-indigo-50 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/20",
      border: "hover:border-indigo-300 dark:hover:border-indigo-700",
      text: "text-indigo-700 dark:text-indigo-300",
      iconBg:
        "bg-indigo-100 text-indigo-600 dark:bg-indigo-800 dark:text-indigo-200",
    },
    activities: [
      { id: "shalat", label: "Maghrib", type: "mandator", category: "fardu" },
      {
        id: "bakdiyah",
        label: "Ba'diyah",
        type: "sunnah",
        category: "dependent",
      },
      { id: "dhuha", label: "Dhuha", type: "sunnah", category: "sunnah" },
      { id: "puasa", label: "Puasa", type: "sunnah", category: "sunnah" },
      {
        id: "puasa_ramadhan",
        label: "P.Rmdn",
        type: "mandator",
        category: "fardu",
        onlyRamadhan: true,
      },
      {
        id: "tahsin",
        label: "Tahsin",
        type: "mandator",
        category: "kbm",
        showOnDays: [4, 5],
      },
      {
        id: "conversation",
        label: "Conver",
        type: "mandator",
        category: "kbm",
        showOnDays: [3],
      },
      {
        id: "vocabularies",
        label: "Vocab",
        type: "mandator",
        category: "kbm",
        showOnDays: [1, 2],
      },
    ],
  },
  isya: {
    id: "isya",
    label: "Isya",
    subLabel: "19:00 - 21:00",
    theme: "slate",
    startHour: 19,
    style: {
      icon: "moon",
      progressBg: "bg-slate-500",
      gradient:
        "from-slate-50 to-blue-100 dark:from-slate-800 dark:to-blue-900/40",
      border: "hover:border-blue-300 dark:hover:border-blue-700",
      text: "text-slate-700 dark:text-slate-300",
      iconBg:
        "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    },
    activities: [
      { id: "shalat", label: "Isya", type: "mandator", category: "fardu" },
      {
        id: "bakdiyah",
        label: "Ba'diyah",
        type: "sunnah",
        category: "dependent",
      },
      {
        id: "alkahfi",
        label: "Al-Kahfi",
        type: "sunnah",
        category: "sunnah",
        showOnDays: [4],
      },
      {
        id: "tarawih",
        label: "Tarawih",
        type: "sunnah",
        category: "sunnah",
        onlyRamadhan: true,
      },
    ],
  },
};
