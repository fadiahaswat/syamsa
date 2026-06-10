// File: date-manager.js

// ==========================================
// 6. DATE ACTIONS
// ==========================================

window.changeDateView = function (direction) {
  const current = new Date(appState.date);
  current.setDate(current.getDate() + direction);

  const nextDateStr = window.getLocalDateStr(current);
  const todayStr = window.getLocalDateStr();

  if (nextDateStr > todayStr) {
    return window.showToast("Masa depan belum terjadi 🚫", "warning");
  }

  appState.date = nextDateStr;
  window.updateDateDisplay();
  window.updateDashboard();
  window.showToast(`📅 ${window.formatDate(appState.date)}`, "info");
};

window.updateDateDisplay = function () {
  const el = document.getElementById("current-date-display");
  const input = document.getElementById("date-picker-input");

  if (el) el.textContent = window.formatDate(appState.date);
  if (input) input.value = appState.date;
};

window.handleDateChange = function (value) {
  if (!value) return;
  const todayStr = window.getLocalDateStr();

  if (value > todayStr) {
    window.showToast("Tidak bisa memilih tanggal masa depan 🚫", "warning");
    const input = document.getElementById("date-picker-input");
    if (input) input.value = appState.date;
    return;
  }

  appState.date = value;
  window.updateDateDisplay();
  window.updateDashboard();
  window.showToast("Tanggal berhasil diubah", "success");
};


window.startClock = function () {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }

  const updateClock = () => {
    const now = new Date();
    const el = document.getElementById("dash-clock");
    if (el) {
      el.textContent = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const secEl = document.getElementById("dash-clock-sec");
      if (secEl) secEl.textContent = String(now.getSeconds()).padStart(2, "0");
    }

    // PERBAIKAN: Cek pergantian hari (Midnight Rollover) yang benar
    const currentRealDate = window.getLocalDateStr(now);

    // Hanya eksekusi JIKA tanggal di dunia nyata benar-benar sudah berganti
    if (currentRealDate > lastRealDate) {
      // Jika user kebetulan SEDANG berada di tanggal "hari ini" (yang lama), ikut geser ke hari baru
      // Tapi jika user sengaja melihat data kemarin, biarkan saja tidak usah digeser
      if (appState.date === lastRealDate) {
        appState.date = currentRealDate;
        window.updateDateDisplay();
        window.updateDashboard();
      }
      lastRealDate = currentRealDate; // Update referensi tanggal nyata
    }

    try {
      window.checkScheduledNotifications();
    } catch (e) {
      console.error("Notification error:", e);
    }
  };

  updateClock();
  clockInterval = setInterval(updateClock, 1000);
};


window.goToToday = function () {
  const today = window.getLocalDateStr();

  appState.date = today;

  appState.timesheetViewDate = today;

  window.updateDateDisplay();
  window.updateDashboard();
  window.renderTimesheetCalendar();

  window.showToast("Kembali ke hari ini", "success");
};
