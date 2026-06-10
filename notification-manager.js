// File: notification-manager.js

window.toggleNotifications = function () {
  appState.settings.notifications = !appState.settings.notifications;
  localStorage.setItem(
    APP_CONFIG.settingsKey,
    JSON.stringify(appState.settings),
  );

  const btn = document.getElementById("btn-notifications");
  if (btn) btn.classList.toggle("opacity-50", !appState.settings.notifications);

  window.showToast(
    `Notifikasi ${appState.settings.notifications ? "Aktif" : "Nonaktif"}`,
    "info",
  );
};


// ==========================================
// FITUR NOTIFIKASI PINTAR (REMINDER)
// ==========================================

// 1. Meminta Izin Notifikasi (Dipanggil tombol lonceng)
window.requestNotificationPermission = async function () {
  if (!("Notification" in window)) {
    return window.showToast("Browser Anda tidak mendukung notifikasi", "error");
  }

  if (Notification.permission === "granted") {
    // Jika sudah aktif, kirim tes notifikasi
    window.sendLocalNotification(
      "Notifikasi Aktif ✅",
      "Anda akan diingatkan saat waktu presensi tiba.",
      "info",
    );
  } else {
    // Jika belum, minta izin
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      window.showToast("Notifikasi berhasil diaktifkan!", "success");
      window.sendLocalNotification(
        "Assalamu'alaikum!",
        "Sistem pengingat presensi Musyrif aktif.",
        "info",
      );

      // Sembunyikan badge merah di tombol jika ada
      const badge = document.getElementById("notif-badge");
      if (badge) badge.classList.add("hidden");
    } else {
      window.showToast("Izin notifikasi ditolak", "warning");
    }
  }
};

// 2. Fungsi Mengirim Notifikasi
window.sendLocalNotification = function (title, body, type = "info") {
  if (Notification.permission === "granted") {
    // Cek mode HP (Vibrate)
    const options = {
      body: body,
      icon: "https://api.iconify.design/lucide/shield-check.svg?color=%2310b981", // Icon App
      badge: "https://api.iconify.design/lucide/bell.svg?color=%23ffffff",
      vibrate: [200, 100, 200], // Getaran: zzz-z-zzz
      tag: title, // Agar notifikasi dengan judul sama tidak menumpuk
    };

    new Notification(title, options);
  }
};

// 3. Penjadwal Otomatis (Cek Waktu Setiap Menit)
window.checkScheduledNotifications = function () {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();

  // Eksekusi hanya di detik ke-0 (setiap menit pas) agar tidak spam
  if (s !== 0) return;

  // --- TIPE 1: REMINDER MASUK WAKTU (Saat jam mulai pas) ---
  // Shubuh (04:00), Ashar (15:00), Maghrib (18:00), Isya (19:00)
  Object.values(SLOT_WAKTU).forEach((slot) => {
    if (h === slot.startHour && m === 0) {
      window.sendLocalNotification(
        `Waktunya ${slot.label}! 🕌`,
        `Sudah masuk waktu ${slot.label}. Silakan cek kehadiran santri.`,
      );
    }
  });

  // --- TIPE 2: REMINDER DEADLINE (30 Menit Sebelum Habis) ---
  // Shubuh habis jam 06:00 -> Ingatkan jam 05:30
  if (h === 5 && m === 30) {
    window.sendLocalNotification(
      "30 Menit Lagi! ⏳",
      "Waktu presensi Shubuh segera berakhir.",
    );
  }
  // Ashar habis jam 17:00 -> Ingatkan jam 16:30
  if (h === 16 && m === 30) {
    window.sendLocalNotification(
      "Hampir Habis! ⏳",
      "Segera selesaikan presensi Ashar.",
    );
  }
  // Maghrib habis jam 19:00 -> Ingatkan jam 18:45 (15 menit aja karena singkat)
  if (h === 18 && m === 45) {
    window.sendLocalNotification(
      "Segera Isya! ⚠️",
      "Waktu Maghrib tinggal 15 menit.",
    );
  }
  // Isya habis jam 21:00 -> Ingatkan jam 20:30
  if (h === 20 && m === 30) {
    window.sendLocalNotification(
      "Jangan Lupa! 🌙",
      "Pastikan semua santri sudah diabsen Isya.",
    );
  }

  // --- TIPE 3: MOTIVASI HARIAN (Opsional) ---
  // Jam 08:00 Pagi
  if (h === 8 && m === 0) {
    window.sendLocalNotification(
      "Semangat Pagi! ☀️",
      "Semoga hari ini penuh keberkahan dalam mengasuh santri.",
    );
  }
};

// 2. Logika Pindah Tab (UI Change)