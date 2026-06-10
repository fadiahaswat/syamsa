// File: analysis-manager.js

// ==========================================
// FITUR ANALISIS SANTRI (BARU)
// ==========================================

// 1. Setup Dropdown Santri saat buka tab Analysis
window.populateAnalysisDropdown = function () {
  const select = document.getElementById("analysis-santri");
  if (!select) return;

  // Simpan value lama jika ada
  const oldVal = select.value;

  select.innerHTML = '<option value="">-- Pilih Santri --</option>';

  // Sort nama santri
  const sorted = [...FILTERED_SANTRI].sort((a, b) =>
    a.nama.localeCompare(b.nama),
  );

  sorted.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.nis || s.id;
    opt.textContent = s.nama;
    select.appendChild(opt);
  });

  if (oldVal) select.value = oldVal;
};

// 2. Ganti Mode (Harian/Pekan/Bulan/Semester)
window.setAnalysisMode = function (mode) {
  appState.analysisMode = mode;

  // Update UI Button
  document.querySelectorAll(".anl-btn").forEach((btn) => {
    if (btn.dataset.mode === mode) {
      btn.classList.add("active-mode", "text-white");
      btn.classList.remove("text-slate-500");
    } else {
      btn.classList.remove("active-mode", "text-white");
      btn.classList.add("text-slate-500");
    }
  });

  window.runAnalysis();
};

// 3. Helper: Mendapatkan Rentang Tanggal
window.getDateRange = function (mode) {
  const today = new Date(appState.date); // Gunakan tanggal dari Date Picker dashboard
  let start = new Date(today);
  let end = new Date(today);
  let label = "";

  if (mode === "daily") {
    label = window.formatDate(appState.date);
  } else if (mode === "weekly") {
    const day = today.getDay(); // 0 (Sun) - 6 (Sat)
    // Adjust agar Senin jadi hari pertama (Opsional, tergantung kebiasaan pondok)
    // Disini asumsi Senin = start
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    end.setDate(start.getDate() + 6);
    label = `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
  } else if (mode === "monthly") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    label = `${months[today.getMonth()]} ${today.getFullYear()}`;
  } else if (mode === "semester") {
    // Semester 1: Jan - Jun, Semester 2: Jul - Des
    if (today.getMonth() < 6) {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 5, 30);
      label = `Semester Genap (Jan-Jun ${today.getFullYear()})`;
    } else {
      start = new Date(today.getFullYear(), 6, 1);
      end = new Date(today.getFullYear(), 11, 31);
      label = `Semester Ganjil (Jul-Des ${today.getFullYear()})`;
    }
  }

  return { start, end, label };
};

// 4. ENGINE ANALISIS UTAMA
window.runAnalysis = function () {
  const santriId = document.getElementById("analysis-santri").value;
  if (!santriId) {
    document.getElementById("analysis-result").classList.add("hidden");
    document.getElementById("analysis-empty").classList.remove("hidden");
    return;
  }

  document.getElementById("analysis-result").classList.remove("hidden");
  document.getElementById("analysis-empty").classList.add("hidden");

  const range = window.getDateRange(appState.analysisMode);
  document.getElementById("analysis-date-range").textContent = range.label;

  let stats = {
    sekolah: {
      hadir: 0,
      mangkir: 0,
      total: 0,
    },
    shalat: {
      hadir: 0,
      mangkir: 0,
      total: 0,
    },
    mahad: {
      hadir: 0,
      mangkir: 0,
      total: 0,
    },
    sunnah: {
      ya: 0,
      tidak: 0,
      total: 0,
    },
  };

  let curr = new Date(range.start);
  const end = new Date(range.end);
  let loopGuard = 0;

  while (curr <= end && loopGuard < 370) {
    const prevTime = curr.getTime();

    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, "0");
    const d = String(curr.getDate()).padStart(2, "0");
    const safeDateKey = `${y}-${m}-${d}`;

    const dayData = appState.attendanceData[safeDateKey];
    const dayNum = curr.getDay();

    if (dayData) {
      Object.values(SLOT_WAKTU).forEach((slot) => {
        const sData = dayData[slot.id]?.[santriId];
        if (sData) {
          slot.activities.forEach((act) => {
            if (act.showOnDays && !act.showOnDays.includes(dayNum)) return;
            if (act.onlyRamadhan && !window.isRamadhan(safeDateKey)) return;

            const st = sData.status?.[act.id];
            if (!st) return;

            if (act.category === "school") {
              stats.sekolah.total++;
              if (st === "Hadir" || st === "Telat") stats.sekolah.hadir++;
              else stats.sekolah.mangkir++;
            } else if (act.category === "fardu") {
              stats.shalat.total++;
              if (st === "Hadir" || st === "Telat") {
                stats.shalat.hadir++;
              } else {
                stats.shalat.mangkir++;
              }
            } else if (act.category === "kbm") {
              stats.mahad.total++;
              if (st === "Hadir" || st === "Telat") {
                stats.mahad.hadir++;
              } else {
                stats.mahad.mangkir++;
              }
            } else if (
              act.category === "sunnah" ||
              act.category === "dependent"
            ) {
              stats.sunnah.total++;
              if (st === "Ya" || st === "Hadir") stats.sunnah.ya++;
              else stats.sunnah.tidak++;
            }
          });
        }
      });
    }

    curr.setDate(curr.getDate() + 1);
    loopGuard++;

    if (curr.getTime() === prevTime) {
      console.error("Date increment stuck! Breaking loop.");
      break;
    }
  }

  window.renderBar("school", stats.sekolah.hadir, stats.sekolah.mangkir);
  window.renderBar("fardu", stats.shalat.hadir, stats.shalat.mangkir);
  window.renderBar("kbm", stats.mahad.hadir, stats.mahad.mangkir);
  window.renderBar("sunnah", stats.sunnah.ya, stats.sunnah.tidak);

  const pctSekolah = stats.sekolah.total
    ? Math.round((stats.sekolah.hadir / stats.sekolah.total) * 100)
    : 0;

  const pctShalat = stats.shalat.total
    ? Math.round((stats.shalat.hadir / stats.shalat.total) * 100)
    : 0;

  const pctMahad = stats.mahad.total
    ? Math.round((stats.mahad.hadir / stats.mahad.total) * 100)
    : 0;

  const pctSunnah = stats.sunnah.total
    ? Math.round((stats.sunnah.ya / stats.sunnah.total) * 100)
    : 0;

  let totalScore = 0;
  let divider = 0;

  if (stats.sekolah.total) {
    totalScore += pctSekolah * 0.35;
    divider += 0.35;
  }
  if (stats.shalat.total) {
    totalScore += pctShalat * 0.3;
    divider += 0.3;
  }
  if (stats.mahad.total) {
    totalScore += pctMahad * 0.2;
    divider += 0.2;
  }
  if (stats.sunnah.total) {
    totalScore += pctSunnah * 0.15;
    divider += 0.15;
  }

  const finalScore = divider ? Math.round(totalScore / divider) : 0;

  document.getElementById("anl-total-score").textContent = `${finalScore}%`;

  const elVerdict = document.getElementById("anl-verdict");
  if (finalScore >= 90) {
    elVerdict.textContent = "Mumtaz (Sangat Baik)";
    elVerdict.className = "text-sm font-bold text-emerald-500";
  } else if (finalScore >= 75) {
    elVerdict.textContent = "Jayyid (Baik)";
    elVerdict.className = "text-sm font-bold text-blue-500";
  } else if (finalScore >= 60) {
    elVerdict.textContent = "Maqbul (Cukup)";
    elVerdict.className = "text-sm font-bold text-amber-500";
  } else {
    elVerdict.textContent = "Naqis (Kurang)";
    elVerdict.className = "text-sm font-bold text-red-500";
  }

  document.getElementById("anl-score-school").textContent =
    Math.round(pctSekolah) + "%";
  document.getElementById("anl-score-fardu").textContent =
    Math.round(pctShalat) + "%";
  document.getElementById("anl-score-kbm").textContent =
    Math.round(pctMahad) + "%";
  document.getElementById("anl-score-sunnah").textContent =
    Math.round(pctSunnah) + "%";
};

// 5. Render Bar Helper
window.renderBar = function (type, good, bad) {
  const total = good + bad;
  if (total === 0) {
    document.getElementById(`bar-${type}-h`).style.width = "0%";
    document.getElementById(`txt-${type}-h`).textContent = "0";
    // Untuk Sunnah id nya beda (y/t) tapi kita mapping manual disini biar gampang
    if (type === "sunnah") {
      document.getElementById(`bar-${type}-y`).style.width = "0%";
      document.getElementById(`txt-${type}-y`).textContent = "0";
      document.getElementById(`bar-${type}-t`).style.width = "0%";
      document.getElementById(`txt-${type}-t`).textContent = "0";
    } else {
      document.getElementById(`bar-${type}-m`).style.width = "0%";
      document.getElementById(`txt-${type}-m`).textContent = "0";
    }
    return;
  }

  const pctGood = (good / total) * 100;
  const pctBad = (bad / total) * 100;

  if (type === "sunnah") {
    document.getElementById(`bar-${type}-y`).style.width = `${pctGood}%`;
    document.getElementById(`txt-${type}-y`).textContent = good;
    document.getElementById(`bar-${type}-t`).style.width = `${pctBad}%`;
    document.getElementById(`txt-${type}-t`).textContent = bad;
  } else {
    document.getElementById(`bar-${type}-h`).style.width = `${pctGood}%`;
    document.getElementById(`txt-${type}-h`).textContent = good;
    document.getElementById(`bar-${type}-m`).style.width = `${pctBad}%`;
    document.getElementById(`txt-${type}-m`).textContent = bad;
  }
};

window.renderTimesheetCalendar = function () {
  const container = document.getElementById("timesheet-calendar");
  const label = document.getElementById("timesheet-month-label");
  if (!container) return;

  container.innerHTML = "";

  // UBAH: Gunakan appState.timesheetViewDate
  const currentViewDate = new Date(appState.timesheetViewDate || appState.date);
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();

  // Set Label
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  if (label) label.textContent = `${months[month]} ${year}`;

  // Sync input picker
  const picker = document.getElementById("timesheet-month-picker");
  if (picker) picker.value = `${year}-${String(month + 1).padStart(2, "0")}`;

  // Logika Kalender
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Adjustment agar Senin = index 0 (JS default Minggu = 0)
  let startDayIndex = firstDay.getDay() - 1;
  if (startDayIndex === -1) startDayIndex = 6;

  const totalDays = lastDay.getDate();

  let monthlyComplete = 0;
  let monthlyPartial = 0;
  let monthlyLocked = 0;

  // Empty cells before start
  for (let i = 0; i < startDayIndex; i++) {
    const div = document.createElement("div");
    container.appendChild(div);
  }

  // Date cells
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const today = window.getLocalDateStr();

    const diffDays = Math.floor(
      (new Date(today) - new Date(dateStr)) / 86400000,
    );

    let requiredSlots = 0;
    let completedSlots = 0;
    let progressSlots = 0;

    Object.values(SLOT_WAKTU).forEach((slot) => {
      if (window.isSlotHoliday(slot.id, dateStr)) return;

      requiredSlots++;

      const slotData = appState.attendanceData?.[dateStr]?.[slot.id];

      let totalSantri = 0;
      let processedSantri = 0;

      FILTERED_SANTRI.forEach((s) => {
        const santriId = String(s.nis || s.id);

        totalSantri++;

        if (slotData?.[santriId]) {
          processedSantri++;
        }
      });

      if (totalSantri > 0 && processedSantri === totalSantri) {
        completedSlots++;
      }
    });

    const dayInfo = window.getDayCompletionStatus(dateStr);
    let status = "future";

    if (dateStr > today) {
      status = "future";
    } else if (dateStr === today) {
      status = "today";
    } else if (dayInfo.complete) {
      status = "completed";
    } else {
      const access = window.isSlotAccessible(
        Object.keys(SLOT_WAKTU)[0],
        dateStr,
      );

      if (access.locked) {
        status = "locked";
      } else {
        status = "partial";
      }
    }

    if (status === "completed") monthlyComplete++;

    if (status === "partial") monthlyPartial++;

    if (status === "locked") monthlyLocked++;

    let bgColor = "";
    let textColor = "";

    switch (status) {
      case "locked":
        bgColor = "#ef4444";
        textColor = "#fff";
        break;

      case "partial":
        bgColor = "#fbbf24";
        textColor = "#fff";
        break;

      case "completed":
        bgColor = "#10b981";
        textColor = "#fff";
        break;

      case "today":
        bgColor = "#0ea5e9";
        textColor = "#fff";
        break;

      case "future":
        bgColor = "#e2e8f0";
        textColor = "#64748b";
        break;
    }

    const isToday = dateStr === today;

    const borderClass = isToday ? "ring-2 ring-indigo-500 ring-offset-2" : "";

    const div = document.createElement("div");

    div.className = `
aspect-square
flex
flex-col
items-center
justify-center
rounded-xl
text-xs
font-bold
transition-all
hover:scale-110
cursor-pointer
${borderClass}
`;
    div.style.backgroundColor = bgColor;
    div.style.color = textColor;

    div.innerHTML = `
        <span>${d}</span>
        ${
          status === "today"
            ? `<span class="text-[9px] opacity-90">
                    ${completedSlots}/${requiredSlots}
               </span>`
            : ""
        }
    `;

    if (status !== "future" && status !== "locked") {
      div.onclick = () => {
        window.handleDateChange(dateStr);
        window.switchTab("home");
      };
    }

    container.appendChild(div);
  }
  const completeEl = document.getElementById("ts-complete-count");

  const partialEl = document.getElementById("ts-partial-count");

  const lockedEl = document.getElementById("ts-locked-count");

  if (completeEl) completeEl.textContent = monthlyComplete;

  if (partialEl) partialEl.textContent = monthlyPartial;

  if (lockedEl) lockedEl.textContent = monthlyLocked;
};

window.changeTimesheetMonth = function (direction) {
  // Ambil tanggal view saat ini, set ke tgl 1 agar tidak error saat melompati bulan (misal dari 31 Jan ke Feb)
  const d = new Date(appState.timesheetViewDate || appState.date);
  d.setDate(1);
  d.setMonth(d.getMonth() + direction);

  appState.timesheetViewDate = window.getLocalDateStr(d);
  window.renderTimesheetCalendar();
};

window.setTimesheetMonth = function (val) {
  if (!val) return;
  // val dari input type="month" formatnya YYYY-MM
  appState.timesheetViewDate = val + "-01";
  window.renderTimesheetCalendar();
};

// --- LOGIKA LAPORAN REKAP ---

// 1. Set Mode Laporan
window.setReportMode = function (mode) {
  appState.reportMode = mode;

  // Update UI Button
  document.querySelectorAll(".rpt-btn").forEach((btn) => {
    if (btn.dataset.mode === mode) {
      btn.classList.add("active-mode", "text-white");
      btn.classList.remove("text-slate-500");
    } else {
      btn.classList.remove("active-mode", "text-white");
      btn.classList.add("text-slate-500");
    }
  });

  window.updateReportTab(); // Refresh tabel
};

// 2. Helper Range Tanggal (Update support Yearly)
window.getReportDateRange = function (mode) {
  const today = new Date(appState.date);
  const range = window.getDateRange(mode);
  // Override labels with shorter format for the report view
  if (mode === "monthly") {
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
    range.label = `${months[today.getMonth()]} ${today.getFullYear()}`;
  } else if (mode === "semester") {
    range.label =
      today.getMonth() < 6
        ? `Sem. Genap ${today.getFullYear()}`
        : `Sem. Ganjil ${today.getFullYear()}`;
  }
  return range;
};

// --- FITUR GEOFENCING ---

// Rumus Haversine untuk menghitung jarak antar 2 koordinat (dalam meter)