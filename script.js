window.initApp = async function () {
  const loadingEl = document.getElementById("view-loading");
  try {
    try {
      window.startClock();
      window.updateDateDisplay();
      window.refreshIcons();
      if (window.applyLoginModeUI) window.applyLoginModeUI();
    } catch (uiError) {
      console.error("UI Init Error:", uiError);
    }
    try {
      const savedSettings = localStorage.getItem(APP_CONFIG.settingsKey);
      if (savedSettings) {
        appState.settings = {
          ...appState.settings,
          ...JSON.parse(savedSettings),
        };
        if (appState.settings.darkMode)
          document.documentElement.classList.add("dark");
      }
      const savedData = localStorage.getItem(APP_CONFIG.storageKey);
      if (savedData) appState.attendanceData = JSON.parse(savedData);
      const savedLog = localStorage.getItem(APP_CONFIG.activityLogKey);
      if (savedLog) appState.activityLog = JSON.parse(savedLog);
      appState.permits = [];
      const savedPermits = localStorage.getItem(APP_CONFIG.permitKey);
      if (savedPermits) {
        try {
          appState.permits = JSON.parse(savedPermits);
        } catch (permitError) {
          console.error("Error parsing permits:", permitError);
          appState.permits = [];
        }
      }

      appState.reminders = [];
      const savedReminders = localStorage.getItem(APP_CONFIG.remindersKey);
      if (savedReminders) {
        try {
          appState.reminders = JSON.parse(savedReminders);
        } catch (e) {
          console.error("Error parsing reminders:", e);
        }
      } else {
        appState.reminders = [
          { id: "rem1", title: "Siapkan administrasi kehadiran kelas", done: false, date: window.getLocalDateStr(new Date(Date.now() + 24*3600*1000)) },
          { id: "rem2", title: "Rapat koordinasi pamong asrama", done: false, date: window.getLocalDateStr(new Date(Date.now() + 2*24*3600*1000)) },
        ];
        localStorage.setItem(APP_CONFIG.remindersKey, JSON.stringify(appState.reminders));
      }

      appState.agendas = [];
      const savedAgendas = localStorage.getItem(APP_CONFIG.agendasKey);
      if (savedAgendas) {
        try {
          appState.agendas = JSON.parse(savedAgendas);
        } catch (e) {
          console.error("Error parsing agendas:", e);
        }
      } else {
        appState.agendas = [
          { id: "ag1", title: "Ujian Syahadah Tahfizh", type: "ujian", date: window.getLocalDateStr(new Date(Date.now() + 5 * 24 * 3600 * 1000)) },
          { id: "ag2", title: "Perpulangan Santri Ganjil", type: "perpulangan", date: window.getLocalDateStr(new Date(Date.now() + 14 * 24 * 3600 * 1000)) },
          { id: "ag3", title: "Kajian Akbar Bulanan", type: "event", date: window.getLocalDateStr(new Date(Date.now() + 8 * 24 * 3600 * 1000)) },
          { id: "ag4", title: "Rapat Musyrif Akbar", type: "kegiatan", date: window.getLocalDateStr(new Date(Date.now() + 2 * 24 * 3600 * 1000)) },
        ];
        localStorage.setItem(APP_CONFIG.agendasKey, JSON.stringify(appState.agendas));
      }
    } catch (storageError) {
      console.error("Storage Error:", storageError);
      if (!appState.permits) appState.permits = [];
      if (!appState.reminders) appState.reminders = [];
      if (!appState.agendas) appState.agendas = [];
    }
    appState.currentSlotId = window.determineCurrentSlot();
    const dataLoadingPromise = Promise.all([
      window.loadClassData ? window.loadClassData() : Promise.resolve({}),
      window.loadSantriData ? window.loadSantriData() : Promise.resolve([]),
    ]);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Koneksi lambat (Timeout)")),
        window.APP_CONSTANTS.dataLoadTimeoutMs,
      ),
    );
    try {
      const [kelasData, santriData] = await Promise.race([
        dataLoadingPromise,
        timeoutPromise,
      ]);
      MASTER_KELAS = kelasData || {};
      MASTER_SANTRI = santriData || [];
      window.populateClassDropdown();
      const savedAuth = localStorage.getItem(APP_CONFIG.googleAuthKey);
      if (savedAuth) {
        try {
          const authData = JSON.parse(savedAuth);
          const LOGIN_MAX_AGE = 14 * 24 * 60 * 60 * 1000;
          const loginTime = new Date(authData.timestamp).getTime();
          if (!loginTime || Date.now() - loginTime > LOGIN_MAX_AGE) {
            throw new Error("Sesi login kadaluarsa");
          }
          if (
            authData?.profile?.authProvider === "testing" &&
            window.getAuthMode &&
            window.getAuthMode() !== "testing"
          ) {
            throw new Error(
              "Sesi testing dinonaktifkan karena aplikasi berjalan di mode production.",
            );
          }
          if (authData.kelas && MASTER_KELAS[authData.kelas]) {
            appState.selectedClass = authData.kelas;
            appState.userProfile = authData.profile;
            FILTERED_SANTRI = MASTER_SANTRI.filter((s) => {
              const sKelas = String(s.kelas || s.rombel || "").trim();
              return sKelas === appState.selectedClass;
            }).sort((a, b) => a.nama.localeCompare(b.nama));
            if (FILTERED_SANTRI.length > 0) {
              document.getElementById("view-login").classList.add("hidden");
              document.getElementById("view-main").classList.remove("hidden");
              window.updateDashboard();
              window.updateProfileInfo();
              const greetName = window.getProfileDisplayName(authData.profile);
              setTimeout(
                () => window.showToast(`Ahlan, ${greetName}`, "success"),
                500,
              );
            }
          } else {
            throw new Error("Data kelas tidak valid");
          }
        } catch (authError) {
          console.error("Auto-login error:", authError);
          localStorage.removeItem(APP_CONFIG.googleAuthKey);
        }
      }
    } catch (fetchError) {
      console.error("Data Fetch Error:", fetchError);
      window.showToast("Gagal memuat data santri (Offline/Lambat)", "warning");
    }
  } catch (criticalError) {
    console.error("Critical Init Error:", criticalError);
    alert("Terjadi kesalahan sistem: " + criticalError.message);
  } finally {
    if (loadingEl) {
      loadingEl.classList.add("opacity-0", "pointer-events-none");
      setTimeout(() => {
        loadingEl.style.display = "none";
      }, 500);
    }
  }
};

window.populateClassDropdown = function () {
  const select = document.getElementById("login-kelas");
  if (!select) return;

  select.innerHTML =
    '<option value="" disabled selected>-- Pilih Kelas --</option>';
  Object.keys(MASTER_KELAS)
    .sort()
    .forEach((k) => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = `${k} - ${MASTER_KELAS[k].musyrif}`;
      select.appendChild(opt);
    });
};

// Start App
window.onload = window.initApp;
