// File: export-manager.js

// ==========================================
// 7. EXPORT & REPORT
// ==========================================

window.exportToExcel = function () {
  if (!appState.selectedClass || FILTERED_SANTRI.length === 0) {
    return window.showToast("Pilih kelas terlebih dahulu", "warning");
  }

  const dateKey = appState.date;
  const data = appState.attendanceData[dateKey];

  if (!data) {
    return window.showToast("Tidak ada data untuk tanggal ini", "warning");
  }

  let csv = "No,Nama,NIS,Kelas";
  Object.values(SLOT_WAKTU).forEach((slot) => (csv += `,${slot.label}`));
  csv += "\n";

  FILTERED_SANTRI.forEach((s, idx) => {
    const id = String(s.nis || s.id);
    csv += `${idx + 1},"${s.nama}",${s.nis || s.id},${s.kelas}`;

    Object.values(SLOT_WAKTU).forEach((slot) => {
      const mainActId = slot.activities[0]?.id || "shalat"; // <-- PERBAIKAN DI SINI
      const status = data[slot.id]?.[id]?.status?.[mainActId] || "-";
      csv += `,${status}`;
    });
    csv += "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Presensi_${appState.selectedClass}_${appState.date}.csv`;
  link.click();

  window.showToast("File berhasil diunduh", "success");
  window.logActivity("Export Data", `Mengexport data ke Excel`);
};
