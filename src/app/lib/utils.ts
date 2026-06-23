import { MonthRecord, DailyLog, PRACTICES } from "./db";

// Helper to get active month with safe fallback
export const getActiveMonth = (months: MonthRecord[]): MonthRecord => {
  const active = months && months.find((m) => m.active);
  if (active) return active;
  if (months && months.length > 0) return months[0];
  
  // Fallback to current calendar month
  const now = new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return {
    id: "fallback-month",
    label: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    active: true,
    days: daysInMonth
  };
};

// Helper to get short descriptive practice names for chart X-axis
export const getShortPracticeName = (name: string): string => {
  const map: Record<string, string> = {
    'Tahajjud': 'Tahajjud',
    'Tilawah 5 halaman': 'Tilawah',
    'Sholat Rawatib min. 4 rakaat': 'Rawatib',
    'Subuh Berjamaah': 'Subuh Berj.',
    'Al Matsurat Pagi': 'Al-Mats Pagi',
    'Sholat Dhuha min. 4 rakaat': 'Dhuha',
    'Puasa Sunnah': 'Puasa Sunnah',
    'Qawiyyuljism': 'Olahraga',
    'Birrul Walidain': 'B. Walidain',
    'Infaq': 'Infaq',
    'Datang Pembinaan Ontime': 'Pembinaan',
    'Dhuhur Berjamaah': 'Dhuhur Berj.',
    'Ashar Berjamaah': 'Ashar Berj.',
    'Maghrib Berjamaah': 'Maghrib Berj.',
    'Al Matsurat Petang': 'Al-Mats Petang',
    "Isya' Berjamaah": "Isya' Berj.",
    'Piket Harian': 'Piket',
    'Membaca tentang keislaman': 'Membaca Islam'
  };
  return map[name] || name.split(" ")[0];
};


// ── Date helpers ───────────────────────────────────────────────────────────
// We use 2025-0M-DD format for all demo logs (month = MonthRecord.month)
export const dateKey = (month: MonthRecord, day: number) =>
  `${month.year}-${String(month.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

// ── Helpers ────────────────────────────────────────────────────────────────
export const logsForMonth = (logs: DailyLog[], userId: string, month: MonthRecord) =>
  logs.filter((l) => l.userId === userId && l.date.startsWith(
    `${month.year}-${String(month.month).padStart(2, "0")}`
  ));

export const completedDays = (logs: DailyLog[], userId: string, practiceId: string, month: MonthRecord) =>
  logsForMonth(logs, userId, month).filter((l) => l.practiceId === practiceId && l.completed).length;

export const pct = (done: number, target: number) => target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;

export const overallPct = (logs: DailyLog[], userId: string, month: MonthRecord) => {
  if (PRACTICES.length === 0) return 0;
  const pcts = PRACTICES.map((p) => pct(completedDays(logs, userId, p.id, month), p.target));
  return Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length);
};

// Helper to download an element as PDF
export const downloadPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  try {
    const html2pdf = (window as any).html2pdf;
    if (!html2pdf) {
      alert("Library PDF sedang dimuat. Silakan tunggu 1-2 detik dan coba lagi.");
      return;
    }

    document.body.classList.add("printing-pdf");

    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        backgroundColor: document.documentElement.classList.contains("dark") ? "#2d1f2b" : "#fcf9f7"
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    await html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Gagal mengunduh PDF. Silakan coba lagi.");
  } finally {
    document.body.classList.remove("printing-pdf");
  }
};
