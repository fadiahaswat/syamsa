// File: tab-manager.js

window.closeModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.add("hidden");

  const index = modalStack.indexOf(modalId);
  if (index > -1) modalStack.splice(index, 1);

  if (modal._escHandler) {
    document.removeEventListener("keydown", modal._escHandler);
    delete modal._escHandler;
  }

  modal.removeAttribute("aria-modal");
  modal.removeAttribute("role");
};


window.showToast = function (message, type = "info", isPersistent = false) {
  if (!appState.settings.notifications && !isPersistent) return;

  const container = document.getElementById("toast-container");
  if (!container) return;

  // PERBAIKAN: Cegah Toast Dobel dengan mengecek pesan yang identik
  const existingToasts = container.querySelectorAll(".toast-msg-text");
  for (let i = 0; i < existingToasts.length; i++) {
    if (existingToasts[i].textContent === message) {
      // Batalkan pembuatan toast baru jika pesan yang sama persis masih ada di layar
      return existingToasts[i].closest(".toast-element");
    }
  }

  const toast = document.createElement("div");
  const icons = {
    success: "check-circle",
    error: "x-circle",
    warning: "alert-triangle",
    info: "info",
  };

  // Tambahkan class penanda 'toast-element' agar lebih mudah diidentifikasi
  toast.className = `toast-element ${UI_COLORS[type] || UI_COLORS.info} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-[slideUp_0.3s_ease-out] mb-3 z-[9999] cursor-pointer pointer-events-auto`;

  // Tambahkan class penanda 'toast-msg-text' pada bagian teks
  toast.innerHTML = `
        <i data-lucide="${icons[type] || "info"}" class="w-5 h-5" aria-hidden="true"></i>
        <span class="toast-msg-text font-bold text-xs" role="alert">${window.sanitizeHTML(message)}</span>
    `;

  // Fitur Tambahan: Toast sekarang bisa ditutup instan jika di-klik/disentuh (Anti-annoying)
  toast.onclick = () => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    setTimeout(() => toast.remove(), 300);
  };

  container.appendChild(toast);
  window.refreshIcons();

  if (!isPersistent) {
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-20px)";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  } else {
    setTimeout(() => toast.remove(), 10000);
  }

  return toast;
};


window.toggleDarkMode = function () {
  document.documentElement.classList.toggle("dark");
  appState.settings.darkMode =
    document.documentElement.classList.contains("dark");
  localStorage.setItem(
    APP_CONFIG.settingsKey,
    JSON.stringify(appState.settings),
  );
  window.showToast(
    `Mode ${appState.settings.darkMode ? "Gelap" : "Terang"} Aktif`,
    "success",
  );
};


// ==========================================
// 9. TABS & NAVIGATION
// ==========================================

window.switchTab = function (tabName) {
  // 1. Sembunyikan semua konten tab
  document
    .querySelectorAll(".tab-content")
    .forEach((el) => el.classList.add("hidden"));

  // 2. Atur visibilitas Main Content (Dashboard)
  const mainContent = document.getElementById("main-content");
  if (tabName === "home") {
    mainContent.classList.remove("hidden");
  } else {
    mainContent.classList.add("hidden");
  }

  // 3. Tampilkan Tab Target (Laporan/Profil/Analisis)
  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) targetTab.classList.remove("hidden");

  // 4. Update Style Tombol Navigasi
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    if (btn.dataset.target === tabName) {
      btn.classList.add("active");
      if (tabName === "tahfizh") {
        btn.classList.add("text-orange-500");
        btn.classList.remove("text-emerald-500", "text-slate-400");
      } else {
        btn.classList.add("text-emerald-500");
        btn.classList.remove("text-orange-500", "text-slate-400");
      }
    } else {
      btn.classList.remove("active", "text-emerald-500", "text-orange-500");
      btn.classList.add("text-slate-400");
    }
  });

  // 5. Jalankan Logika Spesifik per Tab
  if (tabName === "home") {
    window.updateDashboard();
  } else if (tabName === "report") {
    window.updateReportTab();
  } else if (tabName === "tahfizh") {
    if (window.initTahfizhTab) {
      window.initTahfizhTab();
    }
  } else if (tabName === "profile") {
    appState.timesheetViewDate = appState.date; // <--- TAMBAHKAN INI
    window.updateProfileStats();
    window.renderTimesheetCalendar();
    window.renderPembinaanManagement(); // Refresh list di profil
    window.renderPermitHistory();
  }
  // 6. Refresh Icon Lucide
  if (window.lucide) window.lucide.createIcons();
};

window.getGrade = function (score) {
  if (score >= 97) return "A";
  if (score >= 93) return "A-";
  if (score >= 89) return "B+";
  if (score >= 85) return "B";
  if (score >= 80) return "B-";
  if (score >= 75) return "C+";
  if (score >= 70) return "C";
  return "D";
};

window.getPredikat = function (grade) {
  if (grade === "A" || grade === "A-") {
    return "Mumtaz";
  }
  if (grade === "B+" || grade === "B") {
    return "Jayyid Jiddan";
  }
  if (grade === "B-" || grade === "C+") {
    return "Jayyid";
  }
  return "Maqbul";
};

window.updateReportTab = function () {
  const tbody = document.getElementById("daily-recap-tbody");
  const rangeLabel = document.getElementById("report-date-range");
  const thead = document.querySelector("#tab-report thead tr");

  if (thead) {
    let headerHTML = `
            <th class="p-3 font-bold w-8 text-center">No</th>
            <th class="p-3 font-bold min-w-[140px]">Nama Santri</th>
        `;

    if (appState.reportMode === "daily") {
      headerHTML += `
                <th class="p-3 text-center">Shalat</th>
                <th class="p-3 text-center">Sekolah</th>
                <th class="p-3 text-center">Ma'had</th>
                <th class="p-3 text-center">Sunnah</th>
            `;
    } else if (
      appState.reportMode === "weekly" ||
      appState.reportMode === "monthly"
    ) {
      headerHTML += `
                <th class="p-3 text-center">Shalat %</th>
                <th class="p-3 text-center">Sekolah %</th>
                <th class="p-3 text-center">Ma'had %</th>
                <th class="p-3 text-center">Sunnah %</th>
            `;
    } else if (appState.reportMode === "semester") {
      headerHTML += `
                <th class="p-3 text-center">Shalat</th>
                <th class="p-3 text-center">Sekolah</th>
                <th class="p-3 text-center">Ma'had</th>
                <th class="p-3 text-center">Sunnah</th>
                <th class="p-3 text-center">Grade</th>
            `;
    }

    thead.innerHTML = headerHTML;
  }

  if (!tbody) return;
  tbody.innerHTML = "";

  const range = window.getReportDateRange(appState.reportMode);
  if (rangeLabel) rangeLabel.textContent = range.label;

  const colspan = appState.reportMode === "semester" ? 7 : 6;

  if (!appState.selectedClass || FILTERED_SANTRI.length === 0) {
    tbody.innerHTML =
      `<tr><td colspan="${colspan}" class="p-4 text-center text-xs text-slate-400">Pilih kelas terlebih dahulu</td></tr>`;
    return;
  }

  const STATUS_WEIGHT = {
    Hadir: 100,
    Telat: 90,

    Izin: 75,
    Sakit: 75,

    Pulang: 0,

    Alpa: -50,

    Ya: 100,
    Tidak: 0,
  };

  // OPTIMIZATION: Use Map for O(1) lookup
  const santriStatsMap = new Map();
  FILTERED_SANTRI.forEach((s) => {
    santriStatsMap.set(s.nis || s.id, {
      shalat: {
        score: 0,
        total: 0,
        h: 0,
      },

      sunnah: {
        score: 0,
        total: 0,
        y: 0,
      },

      sekolah: {
        score: 0,
        total: 0,
        h: 0,
      },

      mahad: {
        score: 0,
        total: 0,
        h: 0,
      },
    });
  });

  // OPTIMIZATION: Pre-calculate date range (avoid while loop)
  const startTime = range.start.getTime();
  const endTime = range.end.getTime();
  const dayInMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.min(
    Math.ceil((endTime - startTime) / dayInMs) + 1,
    370,
  );

  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startTime + i * dayInMs);
    const dateKey = window.getLocalDateStr(currentDate);
    const dayNum = currentDate.getDay();
    const dayData = appState.attendanceData[dateKey];

    if (!dayData) continue;

    Object.values(SLOT_WAKTU).forEach((slot) => {
      FILTERED_SANTRI.forEach((s) => {
        const id = String(s.nis || s.id);
        const sData = dayData[slot.id]?.[id];
        const stats = santriStatsMap.get(id);

        if (!sData || !stats) return;

        slot.activities.forEach((act) => {
          if (act.showOnDays && !act.showOnDays.includes(dayNum)) return;
          if (act.onlyRamadhan && !window.isRamadhan(dateKey)) return;

          const st = sData.status[act.id];

          const point = STATUS_WEIGHT[st] ?? 0;

          if (act.category === "fardu") {
            stats.shalat.score += point;
          } else if (act.category === "sunnah") {
            stats.sunnah.score += point;
          } else if (act.category === "school") {
            stats.sekolah.score += point;
          } else if (act.category === "kbm") {
            stats.mahad.score += point;
          }

          if (act.category === "fardu") {
            stats.shalat.total++;

            if (st === "Hadir" || st === "Telat") {
              stats.shalat.h++;
            }
          } else if (act.category === "school") {
            stats.sekolah.total++;

            if (st === "Hadir" || st === "Telat") {
              stats.sekolah.h++;
            }
          } else if (act.category === "kbm") {
            stats.mahad.total++;

            if (st === "Hadir" || st === "Telat") {
              stats.mahad.h++;
            }
          } else if (act.category === "sunnah") {
            stats.sunnah.total++;

            if (st === "Ya" || st === "Hadir") {
              stats.sunnah.y++;
            }
          }
        });
      });
    });
  }

  // RENDER with DocumentFragment
  const fragment = document.createDocumentFragment();
  const makeBar = (pct, color) => `
        <div class="flex flex-col items-center">
            <span class="text-[10px] font-bold ${pct < 60 ? "text-red-500" : "text-slate-600"}">${pct}%</span>
            <div class="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full ${color} transition-all duration-300" style="width: ${pct}%"></div>
            </div>
        </div>`;

  FILTERED_SANTRI.forEach((s, idx) => {
    const id = String(s.nis || s.id);
    const stats = santriStatsMap.get(id);
    if (!stats) return;

    const shalatPct = stats.shalat.total
      ? stats.shalat.score / stats.shalat.total
      : 0;

    const sunnahPct = stats.sunnah.total
      ? stats.sunnah.score / stats.sunnah.total
      : 0;

    const sekolahPct = stats.sekolah.total
      ? stats.sekolah.score / stats.sekolah.total
      : 0;

    const mahadPct = stats.mahad.total
      ? stats.mahad.score / stats.mahad.total
      : 0;

    const scoreList = [];

    if (stats.shalat.total > 0) scoreList.push(shalatPct);

    if (stats.sekolah.total > 0) scoreList.push(sekolahPct);

    if (stats.mahad.total > 0) scoreList.push(mahadPct);

    if (stats.sunnah.total > 0) scoreList.push(sunnahPct);

    const finalScore = scoreList.length
      ? Math.round(scoreList.reduce((a, b) => a + b, 0) / scoreList.length)
      : 0;

    const shalatGrade = window.getGrade(Math.round(shalatPct));

    const sunnahGrade = window.getGrade(Math.round(sunnahPct));

    const sekolahGrade = window.getGrade(Math.round(sekolahPct));

    const mahadGrade = window.getGrade(Math.round(mahadPct));

    const shalatPredikat = window.getPredikat(shalatGrade);

    const sunnahPredikat = window.getPredikat(sunnahGrade);

    const sekolahPredikat = window.getPredikat(sekolahGrade);

    const mahadPredikat = window.getPredikat(mahadGrade);

    const grade = window.getGrade(finalScore);

    const predikat = window.getPredikat(grade);

    const tr = document.createElement("tr");
    tr.className =
      "hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b border-slate-50 dark:border-slate-700/50";

    let shalatCol, schoolCol, kbmCol, sunnahCol;

    if (appState.reportMode === "daily") {
      const dateKey = appState.date;
      const dayData = appState.attendanceData[dateKey] || {};

      let badges = "";
      ["shubuh", "ashar", "maghrib", "isya"].forEach((sid) => {
        const st = dayData[sid]?.[id]?.status?.shalat;
        let color = "bg-slate-100 text-slate-300";

        if (st === "Hadir") color = "bg-emerald-100 text-emerald-600";
        else if (st === "Telat") color = "bg-teal-100 text-teal-600";
        else if (st === "Sakit") color = "bg-amber-100 text-amber-600";
        else if (st === "Izin") color = "bg-blue-100 text-blue-600";
        else if (st === "Pulang") color = "bg-purple-100 text-purple-600";
        else if (st === "Alpa") color = "bg-red-100 text-red-600";

        const label = sid[0].toUpperCase();
        badges += `<span class="w-5 h-5 flex items-center justify-center rounded ${color} text-[9px] font-black" aria-label="${sid}: ${st || "Belum diisi"}">${label}</span>`;
      });
      shalatCol = `<div class="flex justify-center gap-1" role="list">${badges}</div>`;

      const stSchool = dayData["sekolah"]?.[id]?.status?.kbm_sekolah;
      let schColor = "bg-slate-100 text-slate-300";
      let schLabel = "-";

      if (stSchool === "Hadir") {
        schColor = "bg-cyan-100 text-cyan-600";
        schLabel = "H";
      } else if (stSchool === "Telat") {
        schColor = "bg-teal-100 text-teal-600";
        schLabel = "T";
      } else if (stSchool === "Sakit") {
        schColor = "bg-amber-100 text-amber-600";
        schLabel = "S";
      } else if (stSchool === "Izin") {
        schColor = "bg-blue-100 text-blue-600";
        schLabel = "I";
      } else if (stSchool === "Pulang") {
        schColor = "bg-purple-100 text-purple-600";
        schLabel = "P";
      } else if (stSchool === "Alpa") {
        schColor = "bg-red-100 text-red-600";
        schLabel = "A";
      }

      schoolCol = `<div class="flex justify-center"><span class="w-6 h-6 flex items-center justify-center rounded-lg ${schColor} text-[10px] font-black shadow-sm" aria-label="Sekolah: ${stSchool || "Belum diisi"}">${schLabel}</span></div>`;

      kbmCol = `<span class="font-bold text-slate-600 dark:text-slate-400">${stats.mahad.h}</span>`;
      sunnahCol = `<span class="font-bold text-slate-600 dark:text-slate-400">${stats.sunnah.y}</span>`;
    } else {
      const pctShalat = stats.shalat.total
        ? Math.round((stats.shalat.h / stats.shalat.total) * 100)
        : 0;

      const pctSekolah = stats.sekolah.total
        ? Math.round((stats.sekolah.h / stats.sekolah.total) * 100)
        : 0;

      const pctMahad = stats.mahad.total
        ? Math.round((stats.mahad.h / stats.mahad.total) * 100)
        : 0;

      const pctSunnah = stats.sunnah.total
        ? Math.round((stats.sunnah.y / stats.sunnah.total) * 100)
        : 0;

      shalatCol = makeBar(pctShalat, "bg-emerald-500");
      schoolCol = makeBar(pctSekolah, "bg-cyan-500");
      kbmCol = makeBar(pctMahad, "bg-blue-500");
      sunnahCol = makeBar(pctSunnah, "bg-amber-500");
    }

    let scoreColor = "text-red-500";
    if (finalScore >= 85) scoreColor = "text-emerald-500";
    else if (finalScore >= 70) scoreColor = "text-blue-500";
    else if (finalScore >= 50) scoreColor = "text-amber-500";

    let gradeCells = "";

    if (appState.reportMode === "semester") {
      gradeCells = `
                <td class="p-3 text-center">
        
                    <div class="font-black text-lg">
                        ${shalatGrade}
                    </div>
        
                    <div class="text-[9px] text-slate-500">
                        ${shalatPredikat}
                    </div>
        
                </td>
        
                <td class="p-3 text-center">
        
                    <div class="font-black text-lg">
                        ${sekolahGrade}
                    </div>
        
                    <div class="text-[9px] text-slate-500">
                        ${sekolahPredikat}
                    </div>
        
                </td>
        
                <td class="p-3 text-center">
        
                    <div class="font-black text-lg">
                        ${mahadGrade}
                    </div>
        
                    <div class="text-[9px] text-slate-500">
                        ${mahadPredikat}
                    </div>
        
                </td>

                <td class="p-3 text-center">

                    <div class="font-black text-lg">
                        ${sunnahGrade}
                    </div>
                
                    <div class="text-[9px] text-slate-500">
                        ${sunnahPredikat}
                    </div>
                
                </td>
        
                <td class="p-3 text-center">
        
                    <div class="font-black ${scoreColor} text-lg">
                        ${grade}
                    </div>
        
                    <div class="text-[9px] text-slate-500">
                        ${predikat}
                    </div>
        
                </td>
            `;
    }

    tr.innerHTML = `
            <td class="p-3 text-center text-slate-500 text-[10px] font-bold">
                ${idx + 1}
            </td>
        
            <td class="p-3">
                <div class="font-bold text-slate-700 dark:text-slate-200 text-xs">
                    ${window.sanitizeHTML(s.nama)}
                </div>
            </td>
        
            ${
              appState.reportMode === "semester"
                ? gradeCells
                : `
                    <td class="p-3 text-center align-middle">
                        ${shalatCol}
                    </td>
        
                    <td class="p-3 text-center align-middle bg-cyan-50/30 dark:bg-cyan-900/10 border-x border-cyan-100 dark:border-cyan-900/20">
                        ${schoolCol}
                    </td>
        
                    <td class="p-3 text-center align-middle">
                        ${kbmCol}
                    </td>
        
                    <td class="p-3 text-center align-middle">
                        ${sunnahCol}
                    </td>
                `
            }
        `;
    fragment.appendChild(tr);
  });

  tbody.appendChild(fragment);
};

window.updateProfileStats = function () {
  if (!appState.selectedClass) return;

  // Hitung rata-rata
  let totalPercent = 0,
    daysCount = 0;

  // Loop semua tanggal yang ada di DB
  Object.keys(appState.attendanceData).forEach((dateKey) => {
    const dailyStats = { h: 0, total: 0 };
    let hasData = false;

    // Loop Slots
    Object.values(SLOT_WAKTU).forEach((slot) => {
      const stats = window.calculateSlotStats(slot.id, dateKey);
      if (stats.isFilled) {
        dailyStats.h += stats.h;
        dailyStats.total += stats.total;
        hasData = true;
      }
    });

    if (hasData) {
      const pct = dailyStats.total === 0 ? 0 : dailyStats.h / dailyStats.total;
      totalPercent += pct;
      daysCount++;
    }
  });

  const avgEl = document.getElementById("profile-avg-attendance");
  if (avgEl) {
    const avg =
      daysCount === 0 ? 0 : Math.round((totalPercent / daysCount) * 100);
    avgEl.textContent = avg + "%";
  }

  const daysEl = document.getElementById("profile-days-count");
  if (daysEl) daysEl.textContent = daysCount;
};

// 1. Cek Slot Accessible
window.isSlotAccessible = function (slotId, dateStr) {
  const todayStr = window.getLocalDateStr();

  if (dateStr > todayStr) return { locked: true, reason: "future" };

  // Hitung selisih hari (Ms ke Hari)
  const diffTime = Math.abs(new Date(todayStr) - new Date(dateStr));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > window.APP_CONSTANTS.maxEditDaysBack)
    return { locked: true, reason: "limit" };

  if (dateStr === todayStr) {
    const currentHour = new Date().getHours();
    const slotStart = SLOT_WAKTU[slotId].startHour;
    if (currentHour < slotStart) return { locked: true, reason: "wait" };
  }

  return { locked: false, reason: "" };
};

// 2. Default Slot
window.determineCurrentSlot = function () {
  const h = new Date().getHours();
  if (h >= 19) return "isya";
  if (h >= 18) return "maghrib";
  if (h >= 15) return "ashar";
  if (h >= 6) return "sekolah"; // <-- JAM 06:00 - 15:00 = SEKOLAH
  return "shubuh";
};

window.handleClearData = function () {
  window.showConfirmModal(
    "Hapus Data Hari Ini?",
    "Data presensi hari ini akan dihapus permanen.",
    "Hapus",
    "Batal",
    () => {
      delete appState.attendanceData[appState.date];
      window.saveData();
      window.updateDashboard();
      window.showToast("Data berhasil dihapus", "success");
      window.logActivity(
        "Hapus Data",
        `Menghapus data tanggal ${appState.date}`,
      );
    },
  );
};

window.showConfirmModal = function (
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
) {
  const modal = document.getElementById("modal-confirm");
  if (modal) {
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;

    const btnYes = document.getElementById("confirm-yes");
    const btnNo = document.getElementById("confirm-no");

    btnYes.textContent = confirmText;
    btnYes.onclick = () => {
      onConfirm();
      modal.classList.add("hidden");
    };

    btnNo.textContent = cancelText;
    btnNo.onclick = () => modal.classList.add("hidden");

    modal.classList.remove("hidden");
  }
};

// Backup Restore Logic
window.backupData = function () {
  const backup = {
    version: "1.0",
    date: new Date().toISOString(),
    class: appState.selectedClass,
    attendance: appState.attendanceData,
    activityLog: appState.activityLog,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `backup_${appState.selectedClass}_${window.getLocalDateStr()}.json`;
  link.click();

  window.showToast("Backup berhasil diunduh", "success");
};

window.restoreData = function () {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (!backup.attendance) throw new Error("Format salah");

        window.showConfirmModal(
          "Restore Data?",
          "Data saat ini akan tertimpa.",
          "Restore",
          "Batal",
          () => {
            appState.attendanceData = backup.attendance;
            if (backup.activityLog) appState.activityLog = backup.activityLog;
            window.saveData();
            window.updateDashboard();
            window.showToast("Data berhasil di-restore", "success");
          },
        );
      } catch (err) {
        window.showToast("Gagal: " + err.message, "error");
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

// Tambahkan variabel ini di luar/di atas fungsi startClock untuk melacak hari secara real-time
let lastRealDate = window.getLocalDateStr();


window.openModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  const baseZIndex = 1000;
  const zIndex = baseZIndex + modalStack.length * 10;

  modal.style.zIndex = zIndex;
  modal.classList.remove("hidden");
  modalStack.push(modalId);

  const escHandler = (e) => {
    if (e.key === "Escape") {
      window.closeModal(modalId);
    }
  };

  document.addEventListener("keydown", escHandler);
  modal._escHandler = escHandler;
  modal.setAttribute("aria-modal", "true"); // Accessibility
  modal.setAttribute("role", "dialog"); // Accessibility
};


window.switchReportView = function (view) {
  const report = document.getElementById("report-section");
  const analysis = document.getElementById("analysis-section");
  const btnReport = document.getElementById("report-view-btn");
  const btnAnalysis = document.getElementById("analysis-view-btn");

  if (view === "report") {
    report.classList.remove("hidden");
    analysis.classList.add("hidden");

    btnReport.classList.add("bg-white", "dark:bg-slate-700", "text-indigo-600", "dark:text-indigo-400", "shadow-sm");
    btnReport.classList.remove("text-slate-500", "hover:text-slate-700", "dark:hover:text-slate-300");

    btnAnalysis.classList.remove("bg-white", "dark:bg-slate-700", "text-indigo-600", "dark:text-indigo-400", "shadow-sm");
    btnAnalysis.classList.add("text-slate-500", "hover:text-slate-700", "dark:hover:text-slate-300");
  } else {
    report.classList.add("hidden");
    analysis.classList.remove("hidden");

    btnAnalysis.classList.add("bg-white", "dark:bg-slate-700", "text-indigo-600", "dark:text-indigo-400", "shadow-sm");
    btnAnalysis.classList.remove("text-slate-500", "hover:text-slate-700", "dark:hover:text-slate-300");

    btnReport.classList.remove("bg-white", "dark:bg-slate-700", "text-indigo-600", "dark:text-indigo-400", "shadow-sm");
    btnReport.classList.add("text-slate-500", "hover:text-slate-700", "dark:hover:text-slate-300");

    window.populateAnalysisDropdown();
    window.runAnalysis();
  }
};


