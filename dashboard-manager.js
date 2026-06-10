// File: dashboard-manager.js

// ==========================================
// 3. DASHBOARD LOGIC
// ==========================================

window.updateDashboard = function () {
  // 1. Greeting
  const h = new Date().getHours();
  const greet =
    h < 11
      ? "Selamat Pagi"
      : h < 15
        ? "Selamat Siang"
        : h < 18
          ? "Selamat Sore"
          : "Selamat Malam";
  const elGreet = document.getElementById("dash-greeting");
  if (elGreet) elGreet.textContent = greet;

  // 2. Main Card Logic
  const isToday = appState.date === window.getLocalDateStr();
  const mainCard = document.getElementById("dash-main-card");

  if (isToday && mainCard) {
    mainCard.classList.remove("hidden");
    const slot = SLOT_WAKTU[appState.currentSlotId];
    document.getElementById("dash-card-title").textContent = slot.label;

    const access = window.isSlotAccessible(
      appState.currentSlotId,
      appState.date,
    );
    const timeEl = document.getElementById("dash-card-time");

    if (access.locked && access.reason === "wait") {
      timeEl.innerHTML = `<i data-lucide="clock" class="w-3 h-3"></i> Belum Masuk Waktu`;
      mainCard.classList.add("opacity-80", "grayscale");
      mainCard.onclick = () =>
        window.showToast("Belum masuk waktu " + slot.label, "warning");
    } else {
      timeEl.innerHTML = `<i data-lucide="clock" class="w-3 h-3"></i> ${slot.subLabel}`;
      mainCard.classList.remove("opacity-80", "grayscale");
      mainCard.onclick = () => window.openAttendance();
    }
  } else if (mainCard) {
    mainCard.classList.add("hidden");
  }

  // 3. Render List Slot
  window.renderSchoolStatsWidget();
  window.renderSlotList();
  window.renderKBMBanner();
  window.renderActivePermitsWidget();

  window.renderDashboardPembinaan(); // Refresh widget pembinaan

  // 4. Update Stats Chart
  window.updateQuickStats();
  window.drawDonutChart();
  if (window.lucide) window.lucide.createIcons();

  window.updateLocationStatus();
};

// ==========================================
// FITUR STATUS LOKASI DASHBOARD
// ==========================================

window.updateLocationStatus = function () {
  const card = document.getElementById("location-status-card");

  // Jika fitur dimatikan di config, sembunyikan kartu
  if (!GEO_CONFIG.useGeofencing) {
    if (card) card.classList.add("hidden");
    return;
  }

  if (card) card.classList.remove("hidden");

  const cached = window.getCachedLocation();

  if (cached) {
    const elLoading = document.getElementById("loc-loading");

    const elDetails = document.getElementById("loc-details");

    const elNearest = document.getElementById("loc-nearest-name");

    const elDistance = document.getElementById("loc-distance");

    if (elLoading) elLoading.classList.add("hidden");

    if (elDetails) elDetails.classList.remove("hidden");

    if (elNearest) elNearest.textContent = cached.locationName;

    if (elDistance) elDistance.textContent = Math.round(cached.distance) + "m";

    return;
  }

  // Ambil Elemen UI
  const elLoading = document.getElementById("loc-loading");
  const elDetails = document.getElementById("loc-details");
  const elError = document.getElementById("loc-error");

  const elNearest = document.getElementById("loc-nearest-name");
  const elDistance = document.getElementById("loc-distance");
  const elBadge = document.getElementById("loc-badge");
  const elMessage = document.getElementById("loc-message");
  const elIcon = document.getElementById("loc-icon");
  const elIconBg = document.getElementById("loc-icon-bg");

  // Reset Tampilan ke Loading
  if (elLoading) elLoading.classList.remove("hidden");
  if (elDetails) elDetails.classList.add("hidden");
  if (elError) elError.classList.add("hidden");

  // Cek Support Browser
  if (!navigator.geolocation) {
    if (elLoading) elLoading.classList.add("hidden");
    if (elError) {
      elError.classList.remove("hidden");
      elError.innerHTML =
        '<p class="text-[10px] font-bold text-red-500">Browser tidak dukung GPS</p>';
    }
    return;
  }

  // Eksekusi GPS
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      let nearestDist = Infinity;
      let nearestName = "Tidak diketahui";
      let isInside = false;

      // 1. Cari Lokasi Terdekat dari Array GEO_CONFIG
      GEO_CONFIG.locations.forEach((loc) => {
        const dist = window.getDistanceFromLatLonInMeters(
          userLat,
          userLng,
          loc.lat,
          loc.lng,
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestName = loc.name;
        }
      });

      // 2. Cek apakah masuk radius
      if (nearestDist <= GEO_CONFIG.maxRadiusMeters) {
        isInside = true;
      }

      localStorage.setItem(
        GPS_CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          distance: nearestDist,
          locationName: nearestName,
          isInside: isInside,
        }),
      );

      // 3. Update Tampilan
      if (elLoading) elLoading.classList.add("hidden");
      if (elDetails) elDetails.classList.remove("hidden");

      if (elNearest) elNearest.textContent = nearestName;
      if (elDistance) elDistance.textContent = Math.round(nearestDist) + "m";

      if (isInside) {
        // Tampilan HIJAU (Aman)
        elBadge.textContent = "AMAN";
        elBadge.className =
          "px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-600 border border-emerald-200";

        elMessage.innerHTML = `<span class="text-emerald-600 flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> Posisi sesuai. Silakan isi presensi.</span>`;

        elIcon.setAttribute("data-lucide", "map-pin");
        elIcon.classList.remove(
          "text-slate-400",
          "text-red-500",
          "text-amber-500",
        );
        elIcon.classList.add("text-emerald-500");

        elIconBg.classList.remove("bg-slate-100", "bg-red-100", "bg-amber-100");
        elIconBg.classList.add("bg-emerald-100");
      } else {
        // Tampilan MERAH (Jauh)
        elBadge.textContent = "JAUH";
        elBadge.className =
          "px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-red-100 text-red-600 border border-red-200";

        const selisih = Math.round(nearestDist - GEO_CONFIG.maxRadiusMeters);
        elMessage.innerHTML = `<span class="text-red-500 flex items-center gap-1"><i data-lucide="alert-circle" class="w-3 h-3"></i> Terlalu jauh ${selisih}m dari batas radius.</span>`;

        elIcon.setAttribute("data-lucide", "map-pin-off");
        elIcon.classList.remove(
          "text-slate-400",
          "text-emerald-500",
          "text-amber-500",
        );
        elIcon.classList.add("text-red-500");

        elIconBg.classList.remove(
          "bg-slate-100",
          "bg-emerald-100",
          "bg-amber-100",
        );
        elIconBg.classList.add("bg-red-100");
      }

      if (window.lucide) window.lucide.createIcons();
    },
    (error) => {
      if (elLoading) elLoading.classList.add("hidden");
      if (elError) {
        elError.classList.remove("hidden");
        let msg = "Gagal deteksi lokasi.";
        if (error.code === 1) msg = "Izin lokasi ditolak.";
        else if (error.code === 2) msg = "Sinyal GPS lemah.";
        else if (error.code === 3) msg = "Waktu GPS habis.";
        elError.innerHTML = `<p class="text-[10px] font-bold text-red-500 leading-tight">${msg}</p>`;
      }
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: GPS_CACHE_DURATION },
  );
};

window.renderSlotList = function () {
  const container = document.getElementById("dash-other-slots");
  if (!container) return;

  container.innerHTML = "";
  const tpl = document.getElementById("tpl-slot-item");
  const isToday = appState.date === window.getLocalDateStr();
  const fragment = document.createDocumentFragment();

  Object.values(SLOT_WAKTU).forEach((s) => {
    const clone = tpl.content.cloneNode(true);
    const item = clone.querySelector(".slot-item");
    const access = window.isSlotAccessible(s.id, appState.date);
    const stats = window.calculateSlotStats(s.id);

    // 1. Terapkan Tema Unik per Sesi
    // Hapus class default jika ada, lalu tambah gradient spesifik
    item.classList.add(...s.style.gradient.split(" "));
    item.classList.add(...s.style.border.split(" "));
    item.classList.add(...s.style.text.split(" "));

    // Set Warna Decorative Blob
    const decor = clone.querySelector(".slot-decor");
    if (decor) decor.classList.add(`bg-${s.theme}-400`); // emerald/orange/indigo/slate

    // 2. Setup Icon Unik (Sun/Moon/etc)
    const iconContainer = clone.querySelector(".slot-icon-bg");
    const iconEl = clone.querySelector(".slot-icon");

    if (iconContainer)
      iconContainer.classList.add(...s.style.iconBg.split(" "));
    if (iconEl) iconEl.setAttribute("data-lucide", s.style.icon);

    // 3. Label & Data
    clone.querySelector(".slot-label").textContent = s.label;
    const timeEl = clone.querySelector(".slot-time-range");
    if (timeEl) timeEl.textContent = s.subLabel;

    clone.querySelector(".slot-stat-h").textContent = stats.h;

    const telatEl = clone.querySelector(".slot-stat-t");
    if (telatEl) telatEl.textContent = stats.t;

    clone.querySelector(".slot-stat-s").textContent = stats.s;
    clone.querySelector(".slot-stat-i").textContent = stats.i;

    const pulangEl = clone.querySelector(".slot-stat-p");
    if (pulangEl) pulangEl.textContent = stats.p;

    clone.querySelector(".slot-stat-a").textContent = stats.a;

    // 4. Inisialisasi Elemen & Warna Progress Bar
    const badge = clone.querySelector(".slot-status-badge");
    const progressBar = clone.querySelector(".slot-progress-bar"); // Kembali gunakan nama aslinya
    const progressText = clone.querySelector(".slot-progress-text");

    // Peta warna Hex Tailwind (Mengatasi masalah class CSS yang tidak ter-compile)
    const themeColors = {
      emerald: "#10b981", // Shubuh
      cyan: "#06b6d4", // Sekolah
      orange: "#f97316", // Ashar
      indigo: "#6366f1", // Maghrib
      slate: "#64748b", // Isya
    };

    // 5. Logic Libur / Locked / Unlocked
    const isHoliday = window.isSlotHoliday(s.id, appState.date);

    if (isHoliday) {
      item.classList.remove(...s.style.gradient.split(" "));
      item.classList.add(
        "bg-slate-100",
        "dark:bg-slate-800",
        "grayscale",
        "opacity-70",
      );

      badge.textContent = "Libur";
      badge.className =
        "slot-status-badge text-[10px] font-bold px-2.5 py-0.5 rounded-lg inline-block bg-slate-200 text-slate-500 border border-slate-300 dark:bg-slate-700 dark:text-slate-400 shadow-sm";

      if (iconEl) iconEl.setAttribute("data-lucide", "calendar-x");

      // Set Progress Bar ke 0 dan warna abu-abu
      if (progressBar) {
        progressBar.style.width = "0%";
        progressBar.style.backgroundColor = "#94a3b8";
      }
      if (progressText) progressText.textContent = "-";

      item.onclick = () =>
        window.showToast(`Kegiatan ${s.label} libur pada hari ini.`, "info");
    } else if (access.locked) {
      item.classList.remove(...s.style.gradient.split(" "));
      item.classList.add(
        "bg-slate-100",
        "dark:bg-slate-800",
        "grayscale",
        "opacity-75",
      );

      let lockText = access.reason === "wait" ? "Menunggu" : "Terkunci";
      if (access.reason === "limit") lockText = "Expired";

      badge.textContent = lockText;
      if (iconEl) iconEl.setAttribute("data-lucide", "lock");

      if (progressBar) progressBar.style.backgroundColor = "#94a3b8";

      item.onclick = () =>
        window.showToast(`🔒 Akses ${s.label} ${lockText}`, "error");
    } else {
      if (stats.isFilled) {
        badge.textContent = "Selesai";
        badge.className +=
          " text-emerald-700 bg-emerald-100/80 border-emerald-200";
      } else {
        badge.textContent = "Belum Diisi";
      }

      let percent = 0;

      const totalStatus =
        stats.h + stats.t + stats.i + stats.s + stats.p + stats.a;

      if (totalStatus > 0) {
        percent = Math.round(((stats.h + stats.t) / totalStatus) * 100);
      }

      // Terapkan persentase DAN paksa suntikkan warna Hex Code-nya
      if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.style.backgroundColor = themeColors[s.theme] || "#10b981";
      }
      if (progressText) progressText.textContent = `${percent}%`;

      item.onclick = () => {
        appState.currentSlotId = s.id;
        if (isToday && s.id === window.determineCurrentSlot()) {
          window.updateDashboard();
          document
            .getElementById("main-content")
            .scrollTo({ top: 0, behavior: "smooth" });
        } else {
          window.openAttendance();
        }
      };
    }

    fragment.appendChild(clone);
  });

  container.appendChild(fragment);
};

window.updateProfileInfo = function () {
  const elHeaderName = document.getElementById("header-user-name");
  const elHeaderRole = document.getElementById("profile-role");
  const elHeaderAvatar = document.getElementById("header-avatar");
  const elProfileAvatar = document.getElementById("profile-avatar");

  const elName = document.getElementById("profile-name");
  const elRoleTab = document.getElementById("profile-role-tab");

  if (appState.selectedClass && MASTER_KELAS[appState.selectedClass]) {
    const musyrifName = MASTER_KELAS[appState.selectedClass].musyrif;
    const className = appState.selectedClass;

    if (elHeaderName) elHeaderName.textContent = musyrifName.split(" ")[0];
    if (elHeaderRole) elHeaderRole.textContent = className;

    if (elHeaderAvatar) {
      const photoUrl = appState.userProfile?.picture;

      if (photoUrl) {
        elHeaderAvatar.innerHTML = `
                    <img
                        src="${photoUrl}"
                        alt="Avatar"
                        class="w-full h-full rounded-full object-cover"
                    >
                `;
      } else {
        const initials = musyrifName
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

        elHeaderAvatar.textContent = initials;
      }
    }

    if (elProfileAvatar) {
      const photoUrl = appState.userProfile?.picture;

      if (photoUrl) {
        elProfileAvatar.innerHTML = `
                    <img
                        src="${photoUrl}"
                        alt="Avatar"
                        class="w-full h-full object-cover"
                    >
                `;
      } else {
        elProfileAvatar.innerHTML = `
                    <i data-lucide="user" class="w-10 h-10"></i>
                `;
      }
    }

    if (window.lucide) {
      lucide.createIcons();
    }

    if (elName) elName.textContent = musyrifName;
    if (elRoleTab) elRoleTab.textContent = `Musyrif ${className}`;

    const elSidebarName = document.getElementById("sidebar-user-name");
    const elSidebarClass = document.getElementById("sidebar-class-name");
    const elSidebarAvatar = document.getElementById("sidebar-avatar");
    if (elSidebarName) elSidebarName.textContent = musyrifName;
    if (elSidebarClass) elSidebarClass.textContent = `Musyrif ${className}`;
    if (elSidebarAvatar) {
      const photoUrl = appState.userProfile?.picture;

      if (photoUrl) {
        elSidebarAvatar.innerHTML = `
                    <img
                        src="${photoUrl}"
                        alt="Avatar"
                        class="w-full h-full rounded-full object-cover"
                    >
                `;
      } else {
        const initials = musyrifName
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

        elSidebarAvatar.textContent = initials;
      }
    }
  }
};


window.updateQuickStats = function () {
  if (!appState.selectedClass) return;

  // PERBAIKAN: Hitung kumulatif seharian agar sama dengan chart
  let totalStats = { h: 0, s: 0, i: 0, a: 0 };

  Object.values(SLOT_WAKTU).forEach((slot) => {
    const stats = window.calculateSlotStats(slot.id);
    if (stats.isFilled) {
      totalStats.h += stats.h;
      totalStats.s += stats.s;
      totalStats.i += stats.i;
      totalStats.a += stats.a;
    }
  });

  document.getElementById("stat-hadir").textContent = totalStats.h;
  document.getElementById("stat-sakit").textContent = totalStats.s;
  document.getElementById("stat-izin").textContent = totalStats.i;
  document.getElementById("stat-alpa").textContent = totalStats.a;
};

// Ganti fungsi window.drawDonutChart yang lama dengan ini:

window.drawDonutChart = function () {
  const canvas = document.getElementById("weekly-chart");

  if (!canvas || canvas.offsetParent === null) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const dpr = window.devicePixelRatio || 1;

  if (
    canvas.width !== rect.width * dpr ||
    canvas.height !== rect.height * dpr
  ) {
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }

  const width = rect.width;
  const height = rect.height;
  const centerX = width / 2;
  const centerY = height / 2;

  let radius = Math.min(width, height) / 2 - 10;
  if (radius <= 0) {
    console.warn("Canvas too small for chart");
    return;
  }

  ctx.clearRect(0, 0, width, height);

  let stats = { h: 0, s: 0, i: 0, a: 0 };
  let totalPeristiwa = 0;
  let activeSlots = 0;

  if (appState.selectedClass) {
    Object.values(SLOT_WAKTU).forEach((slot) => {
      const sStats = window.calculateSlotStats(slot.id);
      if (sStats.isFilled) {
        stats.h += sStats.h;
        stats.s += sStats.s;
        stats.i += sStats.i;
        stats.a += sStats.a;
        totalPeristiwa += sStats.total;
        activeSlots++;
      }
    });
  }

  const divider = activeSlots > 0 ? activeSlots : 1;

  const setLegend = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setLegend("legend-hadir", Math.round(stats.h / divider));
  setLegend("legend-sakit", Math.round(stats.s / divider));
  setLegend("legend-izin", Math.round(stats.i / divider));
  setLegend("legend-alpa", Math.round(stats.a / divider));

  if (totalPeristiwa === 0 || radius === 0) {
    if (radius > 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = document.documentElement.classList.contains("dark")
        ? "#334155"
        : "#e2e8f0";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.stroke();
      drawCenterText(ctx, centerX, centerY, "0%", "Belum Ada Data");
    }
    return;
  }

  const segments = [
    { value: stats.h, color: "#10b981" },
    { value: stats.s, color: "#f59e0b" },
    { value: stats.i, color: "#3b82f6" },
    { value: stats.a, color: "#f43f5e" },
  ];

  let startAngle = -Math.PI / 2;

  segments.forEach((seg) => {
    if (seg.value > 0) {
      const sliceAngle = (seg.value / totalPeristiwa) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = 14;
      ctx.lineCap = "butt";
      ctx.stroke();

      startAngle = endAngle;
    }
  });

  const percentHadir = Math.round((stats.h / totalPeristiwa) * 100);
  drawCenterText(ctx, centerX, centerY, `${percentHadir}%`, "Hadir");

  const statsText = document.getElementById("dash-stats-text");
  if (statsText) statsText.textContent = `${percentHadir}% KEHADIRAN`;
};

function drawCenterText(ctx, x, y, mainText, subText) {
  ctx.fillStyle = document.documentElement.classList.contains("dark")
    ? "#fff"
    : "#1e293b";
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(mainText, x, y - 5);

  ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(subText, x, y + 18);
}


window.getDistanceFromLatLonInMeters = function (lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius bumi dalam meter
  const dLat = window.deg2rad(lat2 - lat1);
  const dLon = window.deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(window.deg2rad(lat1)) *
      Math.cos(window.deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Jarak dalam meter
  return d;
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

window.deg2rad = function (deg) {
  return deg * (Math.PI / 180);
};

// Fungsi Utama Verifikasi Lokasi (Async)
window.verifyLocation = function () {
  return new Promise((resolve, reject) => {
    if (!GEO_CONFIG.useGeofencing) {
      resolve(true);
      return;
    }

    if (!navigator.geolocation) {
      reject("Browser tidak mendukung GPS.");
      return;
    }

    const toastId = window.showToast(
      "📡 Memeriksa lokasi GPS...",
      "info",
      true,
    );

    const timeout = setTimeout(() => {
      reject("Timeout: GPS tidak merespons dalam 10 detik");
      if (toastId) toastId.remove();
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout);
        if (toastId) toastId.remove();

        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        let isInside = false;
        let nearestDist = 9999999;
        let nearestName = "Unknown";

        GEO_CONFIG.locations.forEach((loc) => {
          const dist = window.getDistanceFromLatLonInMeters(
            userLat,
            userLng,
            loc.lat,
            loc.lng,
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestName = loc.name;
          }

          if (dist <= GEO_CONFIG.maxRadiusMeters) {
            isInside = true;
          }
        });

        if (isInside) {
          resolve(true);
        } else {
          reject(
            `Lokasi Anda terlalu jauh (${Math.round(nearestDist)}m dari ${nearestName}). Radius maksimal: ${GEO_CONFIG.maxRadiusMeters}m.`,
          );
        }
      },
      (error) => {
        clearTimeout(timeout);
        if (toastId) toastId.remove();

        let msg = "Gagal mendeteksi lokasi.";
        if (error.code === 1)
          msg = "Izin lokasi ditolak. Aktifkan GPS di browser.";
        else if (error.code === 2)
          msg = "Sinyal GPS tidak ditemukan. Pastikan Anda di luar ruangan.";
        else if (error.code === 3) msg = "Waktu deteksi GPS habis. Coba lagi.";

        reject(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: GPS_CACHE_DURATION,
      },
    );
  });
};


window.quickOpen = function (slotId) {
  if (window.isSlotHoliday(slotId, appState.date)) {
    return window.showToast(
      `Kegiatan ${SLOT_WAKTU[slotId].label} libur pada hari ini.`,
      "info",
    );
  }
  // 1. Set slot yang dipilih ke state global
  appState.currentSlotId = slotId;

  // 2. Update tampilan dashboard (opsional, agar chart/judul berubah)
  window.updateDashboard();

  // 3. Langsung buka halaman absensi
  window.openAttendance();

  // 4. Beri feedback visual
  const labels = {
    shubuh: "Shubuh",
    sekolah: "Sekolah",
    ashar: "Ashar",
    maghrib: "Maghrib",
    isya: "Isya",
  };
  window.showToast(`Membuka presensi ${labels[slotId]}`, "info");
};

window.showStatDetails = function (statusType) {
  const modal = document.getElementById("modal-stat-detail");
  const container = document.getElementById("stat-detail-list");
  const title = document.getElementById("stat-detail-title");

  // 1. Setup UI Modal
  modal.classList.remove("hidden");
  container.innerHTML =
    '<div class="text-center py-4"><span class="loading-spinner"></span></div>';

  // Warna Judul sesuai Tipe
  let colorClass = "text-slate-800";
  if (statusType === "Sakit") colorClass = "text-amber-500";
  else if (statusType === "Izin") colorClass = "text-blue-500";
  else if (statusType === "Alpa") colorClass = "text-rose-500";
  else if (statusType === "Hadir") colorClass = "text-emerald-500";
  // Tambahkan Handling Telat & Pulang (Jaga-jaga)
  else if (statusType === "Telat") colorClass = "text-teal-500";
  else if (statusType === "Pulang") colorClass = "text-purple-500";

  title.textContent = `Daftar ${statusType}`;
  title.className = `text-xl font-black ${colorClass}`;

  // 2. Ambil Data Real
  const dateKey = appState.date;
  const slotId = appState.currentSlotId; // Data berdasarkan slot aktif dashboard
  const slotData = appState.attendanceData[dateKey]?.[slotId] || {};

  const slotConfig = SLOT_WAKTU[slotId];
  const mainActId = slotConfig?.activities?.[0]?.id || "shalat";

  // Filter Santri
  const list = FILTERED_SANTRI.filter((s) => {
    const id = String(s.nis || s.id);
    const data = slotData[id];

    // Cek status Shalat (Utama)
    const currentStatus = data?.status?.[mainActId];

    // Logic Matching
    if (statusType === "Hadir") return currentStatus === "Hadir";
    if (statusType === "Sakit") return currentStatus === "Sakit";
    if (statusType === "Izin") return currentStatus === "Izin";
    if (statusType === "Pulang") return currentStatus === "Pulang";
    if (statusType === "Alpa") return currentStatus === "Alpa";

    return false;
  });

  container.innerHTML = "";

  // 3. Render List
  if (list.length === 0) {
    container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 text-slate-400">
                <i data-lucide="user-x" class="w-12 h-12 mb-3 opacity-50"></i>
                <p class="text-xs font-bold">Tidak ada santri ${statusType}</p>
            </div>
        `;
  } else {
    list.forEach((s) => {
      const id = String(s.nis || s.id);
      const note = slotData[id]?.note || "-";

      // Generate HTML Item
      const div = document.createElement("div");
      div.className =
        "flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700";
      div.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center font-black text-xs text-slate-600 border border-slate-200 shadow-sm">
                    ${s.nama.substring(0, 2).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-800 dark:text-white text-sm truncate">${window.sanitizeHTML(s.nama)}</h4>
                    <p class="text-[10px] text-slate-500 truncate">${s.asrama || s.kelas}</p>
                </div>
                ${
                  note !== "-" && note !== ""
                    ? `
                <div class="max-w-[40%] text-right">
                    <span class="inline-block px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 text-[9px] text-slate-500 leading-tight">
                        ${note}
                    </span>
                </div>`
                    : ""
                }
            `;
      container.appendChild(div);
    });
  }

  if (window.lucide) window.lucide.createIcons();
};

window.renderDashboardPembinaan = function () {
  const container = document.getElementById("dashboard-pembinaan-list");
  const badge = document.getElementById("pembinaan-count-badge");
  const cardTitle = document.querySelector("#dashboard-pembinaan-card h3");

  // Ubah Judul Widget agar mencakup semua (yang sudah & belum dibina)
  if (cardTitle)
    cardTitle.innerHTML = `<i data-lucide="alert-triangle" class="w-4 h-4 text-red-500 mr-2 inline"></i>Pelanggaran Hari Ini`;

  if (!container) return;

  const dateKey = appState.date;
  const dayData = appState.attendanceData[dateKey];

  let violationList = [];
  let pendingCount = 0;

  if (dayData) {
    FILTERED_SANTRI.forEach((s) => {
      const id = String(s.nis || s.id);

      Object.values(SLOT_WAKTU).forEach((slot) => {
        const sData = dayData[slot.id]?.[id];
        const st = sData?.status?.shalat;

        // Syarat: Status ALPA (Tidak peduli sudah dibina atau belum)
        if (st === "Alpa") {
          const isCoached = sData.coaching && sData.coaching.done;

          // Hitung yang belum dibina untuk badge notifikasi
          if (!isCoached) pendingCount++;

          violationList.push({
            ...s,
            slotLabel: slot.label,
            slotId: slot.id,
            date: dateKey,
            isCoached: isCoached,
            coachingInfo: sData.coaching, // Bawa info jika perlu ditampilkan
          });
        }
      });
    });
  }

  // Update Badge (Merah jika ada pending, Hijau jika semua beres)
  if (badge) {
    if (pendingCount > 0) {
      badge.textContent = `${pendingCount} Perlu Dibina`;
      badge.className =
        "px-2 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-bold shadow-sm animate-pulse";
    } else if (violationList.length > 0) {
      badge.textContent = `Tuntas (${violationList.length})`;
      badge.className =
        "px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-600 text-[10px] font-bold border border-emerald-200";
    } else {
      badge.textContent = "0 Pelanggaran";
      badge.className =
        "px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold";
    }
  }

  // Render UI
  container.innerHTML = "";

  if (violationList.length === 0) {
    container.innerHTML = `
            <div class="text-center py-8">
                <div class="inline-flex p-3 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 mb-2 border border-emerald-100 dark:border-emerald-800">
                    <i data-lucide="shield-check" class="w-6 h-6"></i>
                </div>
                <p class="text-[10px] font-bold text-slate-400">Nihil pelanggaran hari ini</p>
            </div>`;
  } else {
    // SORTING: Yang BELUM DIBINA taruh paling atas
    violationList.sort((a, b) =>
      a.isCoached === b.isCoached ? 0 : a.isCoached ? 1 : -1,
    );

    violationList.forEach((p) => {
      const div = document.createElement("div");

      // Visual Distinction: Jika sudah dibina, buat agak transparan/abu
      const bgClass = p.isCoached
        ? "bg-slate-50 dark:bg-slate-900 opacity-75 grayscale-[0.5] border-slate-100"
        : "bg-white dark:bg-slate-800 border-red-100 dark:border-red-900/30 shadow-sm";

      div.className = `flex items-center justify-between p-3 rounded-xl border mb-2 transition-all ${bgClass}`;

      let actionHtml = "";

      if (p.isCoached) {
        // TAMPILAN SUDAH DIBINA (Tetap Muncul)
        actionHtml = `
                    <div class="text-right">
                         <span class="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 text-[10px] font-bold border border-slate-200 dark:border-slate-600 flex items-center gap-1 cursor-default">
                            <i data-lucide="check-check" class="w-3 h-3 text-emerald-500"></i> Sudah Dibina
                        </span>
                    </div>
                `;
      } else {
        // TAMPILAN BELUM DIBINA (Tombol Action Hijau)
        const dataStr = JSON.stringify({
          id: p.nis || p.id,
          nama: p.nama,
          slotId: p.slotId,
          date: p.date,
          slotLabel: p.slotLabel,
        }).replace(/"/g, "&quot;");

        actionHtml = `
                    <button onclick="window.openPembinaanModal(${dataStr})" class="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1">
                        <i data-lucide="heart-handshake" class="w-3 h-3"></i> Bina
                    </button>
                `;
      }

      div.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-500 border border-slate-200">
                        ${p.nama.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">${p.nama}</h4>
                        <p class="text-[10px] text-red-500 font-medium flex items-center gap-1">
                            <i data-lucide="x" class="w-3 h-3"></i>
                            Alpa ${p.slotLabel}
                        </p>
                    </div>
                </div>
                ${actionHtml}
            `;
      container.appendChild(div);
    });
  }

  const card = document.getElementById("dashboard-pembinaan-card");
  if (card) card.classList.remove("hidden");

  if (window.lucide) window.lucide.createIcons();
};

window.renderPembinaanManagement = function () {
  const container = document.getElementById("pembinaan-full-list");
  if (!container) return;

  // 1. Akumulasi Data Pelanggaran (HANYA YANG SUDAH DIBINA)
  let problemList = [];
  let counts = { l1: 0, l2: 0, l3: 0 };

  if (!appState.attendanceData) appState.attendanceData = {};

  FILTERED_SANTRI.forEach((s) => {
    const id = String(s.nis || s.id);

    let dates = [];
    Object.keys(appState.attendanceData).forEach((date) => {
      const dayData = appState.attendanceData[date];
      if (!dayData) return;

      let slots = [];

      Object.values(SLOT_WAKTU).forEach((slot) => {
        const sData = dayData[slot.id]?.[id];
        const st = sData?.status?.shalat;

        // --- LOGIKA POIN BARU ---
        // Hanya hitung poin JIKA Alpa DAN sudah ada data coaching (done: true)
        if (st === "Alpa" && sData.coaching && sData.coaching.done) {
          slots.push({
            label: slot.label,
            id: slot.id,
            action: sData.coaching.action, // Simpan info tindakan utk ditampilkan
          });
        }
      });

      if (slots.length > 0) {
        dates.push({ date: date, slots: slots });
      }
    });

    dates.sort((a, b) => b.date.localeCompare(a.date));

    // Hitung Total Poin (Total Slot yang sudah dibina)
    const totalAlpa = dates.reduce((acc, curr) => acc + curr.slots.length, 0);

    if (totalAlpa > 0) {
      const status = window.getPembinaanStatus(totalAlpa);
      problemList.push({ ...s, totalAlpa, status, dates });

      if (status.level === 1) counts.l1++;
      else if (status.level <= 3) counts.l2++;
      else counts.l3++;
    }
  });

  // Update Statistik Header
  const elC1 = document.getElementById("count-level-1");
  const elC2 = document.getElementById("count-level-2");
  const elC3 = document.getElementById("count-level-3");
  if (elC1) elC1.textContent = counts.l1;
  if (elC2) elC2.textContent = counts.l2;
  if (elC3) elC3.textContent = counts.l3;

  // 2. Render List
  container.innerHTML = "";
  if (problemList.length === 0) {
    container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                <div class="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                    <i data-lucide="shield-check" class="w-8 h-8 text-emerald-500"></i>
                </div>
                <p class="text-sm font-bold text-slate-600">Nihil Poin Pelanggaran</p>
                <p class="text-xs text-slate-400 text-center max-w-[200px]">
                    Santri tertib atau pelanggaran belum dibina oleh Musyrif.
                </p>
            </div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  problemList.sort((a, b) => b.totalAlpa - a.totalAlpa);

  problemList.forEach((p) => {
    const percentage = Math.min((p.totalAlpa / 40) * 100, 100);
    const detailId = `detail-${p.nis || p.id}`;

    let detailHtml = "";
    p.dates.forEach((d) => {
      const dateDisplay = window.formatDate(d.date);

      // Render slot dengan info pembinaan
      const slotHtml = d.slots
        .map(
          (s) => `
                <div class="mt-1 flex items-start gap-2">
                    <span class="px-1.5 py-0.5 bg-red-50 text-red-600 text-[9px] font-bold rounded border border-red-100 uppercase shrink-0">${s.label}</span>
                    <span class="text-[10px] text-slate-500 italic">" ${s.action} "</span>
                </div>
            `,
        )
        .join("");

      detailHtml += `
                <div class="py-3 px-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <div class="flex items-center gap-2 mb-1">
                        <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-500"></i>
                        <span class="text-xs font-bold text-slate-700">${dateDisplay}</span>
                    </div>
                    <div class="ml-5">
                        ${slotHtml}
                    </div>
                </div>
            `;
    });

    const div = document.createElement("div");
    div.className =
      "mb-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300";
    div.innerHTML = `
            <div onclick="document.getElementById('${detailId}').classList.toggle('hidden')" class="p-5 cursor-pointer relative overflow-hidden group">
                <div class="relative flex justify-between items-start mb-3">
                    <div class="flex gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-black text-slate-500 dark:text-slate-300 shadow-inner">
                            ${p.nama.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-800 dark:text-white text-base">${p.nama}</h4>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${p.status.color}">
                                    ${p.status.label}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="text-3xl font-black text-slate-700 dark:text-white">${p.totalAlpa}</span>
                        <span class="text-[10px] text-slate-400 font-bold uppercase block -mt-1 tracking-wider">Poin</span>
                    </div>
                </div>
                
                <div class="relative w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                    <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 via-orange-400 to-red-500" style="width: ${percentage}%"></div>
                </div>
                
                <div class="flex justify-between items-center">
                    <p class="text-[10px] text-slate-400">Total Pelanggaran Tervalidasi</p>
                    <button class="text-[10px] font-bold text-slate-400 group-hover:text-emerald-500 flex items-center gap-1 transition-colors">
                        Riwayat Pembinaan <i data-lucide="chevron-down" class="w-3 h-3"></i>
                    </button>
                </div>
            </div>
            
            <div id="${detailId}" class="hidden bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 animate-slideDown">
                ${detailHtml}
            </div>
        `;
    container.appendChild(div);
  });

  if (window.lucide) window.lucide.createIcons();
};



// Fungsi Helper Baru: Loncat ke tanggal tertentu dan buka tab presensi

window.scrollToPembinaan = function () {
  setTimeout(() => {
    const el = document.getElementById("pembinaan-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, 100);
};

window.renderKBMBanner = function () {
  const banner = document.getElementById("kbm-active-banner");
  const titleEl = document.getElementById("kbm-banner-title");

  if (!banner) return;

  // 1. Ambil Data Slot & Waktu Saat Ini
  const currentSlotId = appState.currentSlotId;
  const slotData = SLOT_WAKTU[currentSlotId];

  // Cek hari ini hari apa (0=Ahad, 1=Senin, ...)
  // Gunakan tanggal dari appState jika ingin sinkron dengan tanggal yang dipilih,
  // atau new Date() jika ingin strict realtime. Disini kita pakai appState agar konsisten.
  const currentDay = new Date(appState.date).getDay();

  // 2. Cari Kegiatan KBM yang Aktif Hari Ini di Slot Ini
  // Syarat: category == 'kbm' DAN (showOnDays tidak ada ATAU hari ini termasuk)
  const activeKBM = slotData.activities.find(
    (act) =>
      act.category === "kbm" &&
      (!act.showOnDays || act.showOnDays.includes(currentDay)),
  );

  // 3. Tampilkan atau Sembunyikan Banner
  if (activeKBM) {
    // Ada KBM! Tampilkan Banner
    titleEl.textContent = activeKBM.label; // Misal: "Tahfizh" atau "Conversation"

    // Ganti Icon (Opsional: Jika ada icon khusus per kegiatan)
    // Default kita pakai book-open di HTML

    banner.classList.remove("hidden");
  } else {
    // Tidak ada KBM saat ini
    banner.classList.add("hidden");
  }

  if (window.lucide) window.lucide.createIcons();
};

window.renderActivePermitsWidget = function () {
  const container = document.getElementById("dashboard-active-permits-list");
  const badgeCount = document.getElementById("active-permit-count");

  if (!container) return;
  container.innerHTML = "";

  const combinedList = [];
  const processedNis = new Set(); // Hanya mencatat NIS yang AKTIF sakitnya
  const currentDate = appState.date;

  // 1. DATA PERMIT (SURAT)
  const classNisList = FILTERED_SANTRI.map((s) => String(s.nis || s.id));

  // Filter permit yang relevan (Aktif ATAU selesai hari ini)
  const relevantPermits = appState.permits.filter((p) => {
    if (!classNisList.includes(p.nis)) return false;
    if (p.start_date > currentDate) return false; // Masa depan skip

    // Tampilkan jika belum ada end_date (aktif selamanya)
    // ATAU range tanggal mencakup hari ini
    if (!p.end_date) return true;
    if (currentDate >= p.start_date && currentDate <= p.end_date) return true;
    return false;
  });

  relevantPermits.forEach((p) => {
    let visualActive = p.is_active;
    const catSafe = (p.category || "").toLowerCase();

    // Logika Visual Selesai (Abu-abu)
    if (catSafe === "sakit" && p.end_date) {
      // Jika hari ini > tanggal sembuh -> nonaktif
      if (currentDate > p.end_date) visualActive = false;
      // Jika hari ini == tanggal sembuh, cek sesi
      else if (currentDate === p.end_date && p.end_session) {
        // Jika sesi sekarang > sesi akhir sakit -> nonaktif
        if (
          SESSION_ORDER[appState.currentSlotId] > SESSION_ORDER[p.end_session]
        ) {
          visualActive = false;
        }
      }
    }
    // Logika Izin/Pulang Selesai
    else if (
      (catSafe === "izin" || catSafe === "pulang") &&
      p.end_date &&
      currentDate > p.end_date
    ) {
      visualActive = false;
    } else if (!p.is_active) {
      visualActive = false; // Jika database bilang false, maka false
    }

    // Filter tambahan: Pastikan Permit juga hanya S/I/P (jaga-jaga jika ada kategori lain)
    if (["sakit", "izin", "pulang"].includes(catSafe)) {
      combinedList.push({
        type: "permit",
        id: p.id,
        nis: p.nis,
        category: p.category,
        startTime: p.start_date,
        endTime: p.end_date,
        isActive: visualActive,
        reason: p.reason,
      });

      // PENTING: Hanya block Manual Check jika permit ini MASIH AKTIF.
      if (visualActive) {
        processedNis.add(p.nis);
      }
    }
  });

  // 2. DATA MANUAL (PRESENSI HARIAN)
  const dayData = appState.attendanceData[currentDate];

  if (dayData) {
    FILTERED_SANTRI.forEach((s) => {
      const id = String(s.nis || s.id);
      // Skip jika sudah tercover permit AKTIF
      if (processedNis.has(id)) return;

      let foundStatus = null;
      // PERBAIKAN: Tambahkan 'sekolah' ke dalam daftar pemindaian widget izin manual
      const slots = ["isya", "maghrib", "ashar", "sekolah", "shubuh"];
      for (const slotId of slots) {
        const slotConfig = SLOT_WAKTU[slotId];
        if (!slotConfig) continue;
        const mainActId = slotConfig.activities[0]?.id || "shalat"; // Dinamis!

        const st = dayData[slotId]?.[id]?.status?.[mainActId];

        if (st && ["Sakit", "Izin", "Pulang"].includes(st)) {
          foundStatus = st;
          break;
        }
      }

      if (foundStatus) {
        let category = foundStatus.toLowerCase();

        combinedList.push({
          type: "manual", // Penanda ini data manual
          id: null,
          nis: id,
          category: category,
          startTime: currentDate,
          endTime: null,
          isActive: true, // Manual yang tampil pasti Aktif
          reason: "Presensi Manual",
        });
      }
    });
  }

  // Update Badge & Sorting
  if (badgeCount)
    badgeCount.textContent = combinedList.filter((i) => i.isActive).length;
  combinedList.sort((a, b) =>
    a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1,
  );

  // Render HTML
  if (combinedList.length === 0) {
    container.innerHTML = `<div class="text-center py-6 text-slate-400 text-[10px] font-bold">Semua santri lengkap / Hadir</div>`;
    return;
  }

  combinedList.forEach((item) => {
    const santri = FILTERED_SANTRI.find(
      (s) => String(s.nis || s.id) === item.nis,
    );
    if (!santri) return;

    let colorClass, iconName;
    const cat = item.category.toLowerCase();

    if (cat === "sakit") {
      colorClass = "bg-amber-100 text-amber-600 border-amber-200";
      iconName = "thermometer";
    } else if (cat === "izin") {
      colorClass = "bg-blue-100 text-blue-600 border-blue-200";
      iconName = "file-text";
    } else if (cat === "pulang") {
      colorClass = "bg-purple-100 text-purple-600 border-purple-200";
      iconName = "bus";
    } else {
      colorClass = "bg-slate-100 text-slate-600 border-slate-200";
      iconName = "help-circle";
    }

    let btnHTML = "";
    if (item.isActive) {
      let label = "Sembuh";
      let action = "";

      // Logic Action
      if (item.type === "manual") {
        // Jika manual, tombolnya "Hadirkan"
        action = `window.resolveManualStatus('${item.nis}', '${cat.charAt(0).toUpperCase() + cat.slice(1)}')`;
        label = "Hadirkan";
      } else {
        // Jika permit
        if (cat === "sakit") {
          action = `window.markAsRecovered('${item.id}')`;
        } else {
          label = "Kembali";
          action = `window.markAsReturned('${item.id}')`;
        }
      }

      btnHTML = `
                <button onclick="${action}" class="ml-2 px-3 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 shadow-md flex items-center gap-1">
                    <i data-lucide="check" class="w-3 h-3"></i> ${label}
                </button>`;
    } else {
      btnHTML = `
                <button disabled class="ml-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-bold cursor-not-allowed flex items-center gap-1">
                    <i data-lucide="check-check" class="w-3 h-3"></i> Selesai
                </button>`;
    }

    const div = document.createElement("div");
    div.className = `flex items-center justify-between p-3 rounded-2xl border transition-all mb-2 ${item.isActive ? "bg-white dark:bg-slate-800 shadow-sm" : "bg-slate-50 dark:bg-slate-900 opacity-60 grayscale"}`;
    div.innerHTML = `
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0 border shadow-sm"><i data-lucide="${iconName}" class="w-4 h-4"></i></div>
                <div class="min-w-0">
                    <h4 class="text-xs font-bold text-slate-800 dark:text-white truncate">${santri.nama}</h4>
                    <div class="flex items-center gap-1.5 mt-1">
                        <span class="text-[9px] font-black uppercase ${colorClass.split(" ")[1]}">${item.category}</span>
                        <span class="text-[9px] text-slate-400">• ${item.type === "manual" ? "Manual" : window.formatDate(item.startTime)}</span>
                    </div>
                </div>
            </div>
            ${btnHTML}
        `;
    container.appendChild(div);
  });
  if (window.lucide) window.lucide.createIcons();
};

window.resolveManualStatus = function (nis, statusType) {
  const dateKey = appState.date;
  const dayData = appState.attendanceData[dateKey];
  if (!dayData) return;

  let changed = false;

  Object.keys(dayData).forEach((slotId) => {
    const studentData = dayData[slotId][nis];
    const slotConfig = SLOT_WAKTU[slotId];
    if (!slotConfig) return;

    // PERBAIKAN: Gunakan mainActId agar slot Sekolah juga bisa "Dihadirkan"
    const mainActId = slotConfig.activities[0]?.id || "shalat";

    if (
      studentData &&
      studentData.status &&
      studentData.status[mainActId] === statusType
    ) {
      studentData.status[mainActId] = "Hadir";

      if (slotConfig.activities) {
        slotConfig.activities.forEach((act) => {
          if (act.category === "dependent") studentData.status[act.id] = "Ya";
          else if (act.category === "kbm" || act.category === "fardu")
            studentData.status[act.id] = "Hadir";
        });
      }

      if (studentData.note) {
        studentData.note = studentData.note.replace(/\[Auto\].*$/g, "").trim();
      }
      changed = true;
    }
  });

  if (changed) {
    window.saveData();
    window.renderActivePermitsWidget();
    window.renderAttendanceList();
    window.showToast("Status berhasil diubah menjadi Hadir", "success");
  } else {
    window.showToast("Tidak ada data yang perlu diubah", "info");
  }
};


window.openPembinaanModal = function (data) {
  const modal = document.getElementById("modal-input-pembinaan");
  if (!modal) return;

  // Isi Data UI
  document.getElementById("bina-nama").textContent = data.nama;
  document.getElementById("bina-avatar").textContent = data.nama
    .substring(0, 2)
    .toUpperCase();
  document.getElementById("bina-detail").textContent =
    `${data.slotLabel} • ${window.formatDate(data.date)}`;

  // Set Default Input
  document.getElementById("bina-date").value = window.getLocalDateStr();
  document.getElementById("bina-action").value = "";

  // Simpan target data di hidden input
  document.getElementById("bina-target-data").value = JSON.stringify(data);

  modal.classList.remove("hidden");
};

window.savePembinaan = function () {
  const rawData = document.getElementById("bina-target-data").value;
  if (!rawData) return;

  try {
    const target = JSON.parse(rawData);
    const dateBina = document.getElementById("bina-date").value;
    const actionBina = document.getElementById("bina-action").value;

    if (!dateBina || !actionBina) {
      return window.showToast(
        "Tanggal dan Bentuk Pembinaan wajib diisi!",
        "warning",
      );
    }

    // Validate date
    if (dateBina > window.getLocalDateStr()) {
      return window.showToast(
        "Tanggal pembinaan tidak boleh di masa depan",
        "warning",
      );
    }

    const dayData = appState.attendanceData[target.date];
    if (
      dayData &&
      dayData[target.slotId] &&
      dayData[target.slotId][target.id]
    ) {
      const studentData = dayData[target.slotId][target.id];

      studentData.coaching = {
        done: true,
        date: dateBina,
        action: window.sanitizeHTML(actionBina),
        musyrif: appState.userProfile ? appState.userProfile.email : "Admin",
        timestamp: new Date().toISOString(),
      };

      window.saveData();

      // Refresh UI safely
      if (typeof window.renderDashboardPembinaan === "function") {
        window.renderDashboardPembinaan();
      }
      if (typeof window.renderPembinaanManagement === "function") {
        window.renderPembinaanManagement();
      }

      window.showToast(
        "Pembinaan berhasil dicatat. Poin ditambahkan.",
        "success",
      );
      window.closeModal("modal-input-pembinaan");
    } else {
      window.showToast(
        "Data presensi tidak ditemukan (mungkin terhapus)",
        "error",
      );
    }
  } catch (e) {
    console.error("Pembinaan save error:", e);
    window.showToast("Gagal menyimpan: " + e.message, "error");
  }
};


window.renderSchoolStatsWidget = function () {
  const widget = document.getElementById("school-stats-widget");
  if (!widget) return;

  // SINKRONISASI: Jika hari ini sekolah libur (Ahad), hilangkan sekalian widgetnya!
  if (window.isSlotHoliday("sekolah", appState.date)) {
    widget.classList.add("hidden");
    return;
  } else {
    widget.classList.remove("hidden");
  }

  const stats = window.calculateSlotStats("sekolah", appState.date);
  const totalSiswa = FILTERED_SANTRI ? FILTERED_SANTRI.length : 0;

  // Hitung Persentase Kehadiran = (Hadir / Total Siswa) * 100
  // Mencegah pembagian dengan 0 yang menghasilkan NaN%
  let presentPercent = 0;
  if (totalSiswa > 0) {
    presentPercent = Math.round((stats.h / totalSiswa) * 100);
    if (presentPercent > 100) presentPercent = 100; // Proteksi maksimal 100%
  }

  const fillEl = document.getElementById("school-progress-bar");
  const textEl = document.getElementById("school-pct-badge");

  if (fillEl) fillEl.style.width = `${presentPercent}%`;
  if (textEl) textEl.textContent = `${presentPercent}%`;

  // Update angka-angka rekap
  const hEl = document.getElementById("sch-stat-h");
  const sEl = document.getElementById("sch-stat-s");
  const iEl = document.getElementById("sch-stat-i");
  const aEl = document.getElementById("sch-stat-a");

  if (hEl) hEl.textContent = stats.h;
  if (sEl) sEl.textContent = stats.s;
  if (iEl) iEl.textContent = stats.i;
  if (aEl) aEl.textContent = stats.a;
  const absentListEl = document.getElementById("school-absent-list");
  if (absentListEl) {
    const absentStudents = FILTERED_SANTRI.filter((s) => {
      const status = window.getAttendanceStatus(
        s.nis || s.id,
        "sekolah",
        appState.date,
      );
      return ["Sakit", "Izin", "Pulang", "Alpa"].includes(status);
    });

    if (absentStudents.length === 0) {
      absentListEl.innerHTML = `
                <div class="text-center text-xs text-slate-400 py-2">
                    Semua santri hadir
                </div>
            `;
    } else {
      absentListEl.innerHTML = absentStudents
        .map((s) => {
          const status = window.getAttendanceStatus(
            s.nis || s.id,
            "sekolah",
            appState.date,
          );

          return `
                        <div class="flex justify-between items-center px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700">
                            <span class="text-xs font-medium">
                                ${s.nama}
                            </span>
                            <span class="text-xs font-bold text-red-500">
                                ${status}
                            </span>
                        </div>
                    `;
        })
        .join("");
    }
  }
};





window.verifyLocationCached = async function () {
  const cache = JSON.parse(localStorage.getItem(GPS_CACHE_KEY) || "null");

  if (cache && Date.now() - cache.timestamp < GPS_CACHE_DURATION) {
    return true;
  }

  await window.verifyLocation();

  localStorage.setItem(
    GPS_CACHE_KEY,
    JSON.stringify({
      timestamp: Date.now(),
    }),
  );

  return true;
};
