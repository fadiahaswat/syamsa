// File: activity-logger.js

// ==========================================
// 8. LOG & MISC
// ==========================================

window.logActivity = function (action, detail) {
  const log = {
    timestamp: new Date().toISOString(),
    action: action,
    detail: detail,
    user: appState.selectedClass
      ? MASTER_KELAS[appState.selectedClass].musyrif
      : "Unknown",
  };

  appState.activityLog.unshift(log);
  if (
    appState.activityLog.length > window.APP_CONSTANTS.maxActivityLogEntries
  ) {
    appState.activityLog = appState.activityLog.slice(
      0,
      window.APP_CONSTANTS.maxActivityLogEntries,
    );
  }

  localStorage.setItem(
    APP_CONFIG.activityLogKey,
    JSON.stringify(appState.activityLog),
  );
};



window.kirimLaporanWA = function () {
  if (!FILTERED_SANTRI.length) return alert("Pilih kelas dulu");

  const slot = SLOT_WAKTU[appState.currentSlotId];
  const stats = window.calculateSlotStats(slot.id);
  const dbSlot = appState.attendanceData[appState.date]?.[slot.id];

  // PERBAIKAN: Dinamis ambil ID aktivitas utama (shalat atau kbm_sekolah)
  const mainActId = slot.activities[0]?.id || "shalat";

  let msg = `*LAPORAN ${appState.selectedClass} - ${slot.label}*\n`;
  msg += `📅 ${window.formatDate(appState.date)}\n\n`;
  msg += `✅ Hadir: ${stats.h}\n`;
  msg += `🤒 Sakit: ${stats.s}\n`;
  msg += `📝 Izin: ${stats.i}\n`;
  msg += `❌ Alpa: ${stats.a}\n\n`;

  const notPresent = [];
  FILTERED_SANTRI.forEach((s) => {
    const id = String(s.nis || s.id);
    const st = dbSlot?.[id]?.status?.[mainActId]; // <-- PERBAIKAN DI SINI
    if (st === "Alpa" || st === "Sakit" || st === "Izin" || st === "Pulang") {
      notPresent.push(`- ${s.nama} (${st})`);
    }
  });

  if (notPresent.length) {
    msg += `*Detail Tidak Hadir:*\n${notPresent.join("\n")}\n`;
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
};
