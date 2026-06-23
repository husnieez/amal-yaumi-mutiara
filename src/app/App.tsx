import { useState, useMemo, useEffect } from "react";
import {
  BookOpen, Moon, Users, Bell, LogOut, Check, X, Plus, Send,
  BarChart2, Calendar, Shield, User, ChevronDown, ChevronLeft,
  ChevronRight, AlertCircle, CheckCircle, Clock, TrendingUp, Search,
  Filter, ArrowUpDown, SlidersHorizontal, Download
} from "lucide-react";
import {
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, LineChart, Line,
} from "recharts";
import {
  PRACTICES, UserRecord, Role, DailyLog, MonthRecord, Notification,
  fetchUsers, fetchLogs, fetchMonths, fetchNotifications, fetchPractices,
  insertLog, deleteLog, insertUser, updateUserRole, insertMonth,
  setActiveMonth, insertNotification, markNotificationRead
} from "./lib/db";

// Helper to get active month with safe fallback
const getActiveMonth = (months: MonthRecord[]): MonthRecord => {
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
const getShortPracticeName = (name: string): string => {
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
const dateKey = (month: MonthRecord, day: number) =>
  `${month.year}-${String(month.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

// ── Helpers ────────────────────────────────────────────────────────────────
const logsForMonth = (logs: DailyLog[], userId: string, month: MonthRecord) =>
  logs.filter((l) => l.userId === userId && l.date.startsWith(
    `${month.year}-${String(month.month).padStart(2, "0")}`
  ));

const completedDays = (logs: DailyLog[], userId: string, practiceId: string, month: MonthRecord) =>
  logsForMonth(logs, userId, month).filter((l) => l.practiceId === practiceId && l.completed).length;

const pct = (done: number, target: number) => target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;

const overallPct = (logs: DailyLog[], userId: string, month: MonthRecord) => {
  if (PRACTICES.length === 0) return 0;
  const pcts = PRACTICES.map((p) => pct(completedDays(logs, userId, p.id, month), p.target));
  return Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length);
};

// Helper to download an element as PDF
const downloadPDF = async (elementId: string, filename: string) => {
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

// ── UI atoms ───────────────────────────────────────────────────────────────
function AvatarBadge({ initials, size = "md", role }: { initials: string; size?: "sm" | "md" | "lg"; role?: Role }) {
  const sz = size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-9 h-9 text-sm";
  const ring = role === "admin" ? "ring-red-400/40" : role === "coordinator" ? "ring-primary/50" : "ring-border";
  return (
    <div className={`${sz} rounded-full bg-secondary flex items-center justify-center font-mono font-medium text-primary ring-1 ${ring} shrink-0`}>
      {initials}
    </div>
  );
}

function RolePill({ role }: { role: Role }) {
  const map = {
    admin: "bg-red-900/30 text-red-300 border-red-700/30",
    coordinator: "bg-primary/10 text-primary border-primary/20",
    user: "bg-secondary text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${map[role]}`}>
      {{ admin: "Admin", coordinator: "Coord.", user: "Member" }[role]}
    </span>
  );
}

function ProgressBar({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-1" : "h-1.5";
  const col = value >= 80 ? "bg-emerald-400" : value >= 50 ? "bg-primary" : "bg-red-400/70";
  return (
    <div className={`w-full ${h} rounded-full bg-secondary overflow-hidden`}>
      <div className={`${h} ${col} rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────────────────────
function LoginScreen({
  onLogin,
  users,
}: {
  onLogin: (u: UserRecord) => void;
  users: UserRecord[];
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase().trim());
    if (u) {
      setError("");
      onLogin(u);
    } else {
      setError("Email not found. Please contact an administrator.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 transition-colors duration-300" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-card border border-primary/30 mb-4 shadow-sm">
            <Moon className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-light text-foreground mb-1" style={{ fontFamily: "'Crimson Pro', serif" }}>Amal Tracker</h1>
          <p className="text-sm text-muted-foreground font-light">Daily spiritual practice record</p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden p-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-900/10 border border-red-700/20 rounded p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!email.trim()}
              className="w-full py-2.5 mt-2 rounded bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
            >
              Sign In
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 font-mono">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ currentUser, active, setView, onLogout, unread, months }: {
  currentUser: UserRecord; active: string; setView: (v: string) => void; onLogout: () => void; unread: number; months: MonthRecord[];
}) {
  const userLinks = [
    { id: "home",          label: "Daily Log",     icon: BookOpen },
    { id: "progress",      label: "My Progress",   icon: TrendingUp },
    { id: "analytics",     label: "Analytics",     icon: BarChart2 },
    { id: "peers",         label: "Community",     icon: Users },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unread },
  ];
  const coordLinks = [
    { id: "home",          label: "Daily Log",     icon: BookOpen },
    { id: "progress",      label: "My Progress",   icon: TrendingUp },
    { id: "analytics",     label: "Analytics",     icon: BarChart2 },
    { id: "group",         label: "My Group",      icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unread },
    { id: "admin-months",  label: "Months",        icon: Calendar },
  ];
  const adminLinks = [
    { id: "admin-users",   label: "Users",   icon: User },
    { id: "admin-months",  label: "Months",  icon: Calendar },
    { id: "admin-reports", label: "Reports", icon: BarChart2 },
  ];
  const links = currentUser.role === "admin" ? adminLinks : currentUser.role === "coordinator" ? coordLinks : userLinks;
  const am = getActiveMonth(months);


  return (
    <aside className="w-56 shrink-0 bg-background border-r border-border flex flex-col h-screen sticky top-0" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif", fontSize: "1.1rem" }}>Amal</span>
          <span className="text-xs font-mono text-muted-foreground ml-auto">{am.label.split(" ")[0]}</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {currentUser.role === "admin" && (
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-2 pb-2 pt-1">Administration</p>
        )}
        {links.map(({ id, label, icon: Icon, badge }: any) => (
          <button key={id} onClick={() => setView(id)}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded text-sm transition-all text-left
              ${active === id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {badge > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-mono flex items-center justify-center">{badge}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-2.5 px-2 mb-3">
          <AvatarBadge initials={currentUser.avatar} role={currentUser.role} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{currentUser.name}</p>
            <RolePill role={currentUser.role} />
          </div>
        </div>
        <button onClick={onLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}

// ── Day Picker Calendar ────────────────────────────────────────────────────
function DayPicker({ month, selectedDay, onChange, markedDays }: {
  month: MonthRecord;
  selectedDay: number;
  onChange: (d: number) => void;
  markedDays: Set<number>;
}) {
  const today = new Date();
  const isActiveMonth = month.active;

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4 text-center">{month.label}</p>
      <div className="grid grid-cols-7 gap-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-mono text-muted-foreground/60 py-1 font-semibold">{d}</div>
        ))}
        {Array.from({ length: month.days }, (_, i) => i + 1).map((day) => {
          const isFuture = isActiveMonth && day > today.getDate();
          const hasMark = markedDays.has(day);
          const isSel = day === selectedDay;
          return (
            <button
              key={day}
              disabled={isFuture}
              onClick={() => onChange(day)}
              className={`relative w-8 h-8 rounded-full text-xs font-mono transition-all flex items-center justify-center mx-auto hover:scale-105 active:scale-95
                ${isFuture ? "text-muted-foreground/20 cursor-not-allowed hover:scale-100" : ""}
                ${isSel ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20" : ""}
                ${!isSel && !isFuture ? "hover:bg-secondary/60 text-foreground" : ""}
              `}
            >
              {day}
              {hasMark && !isSel && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-primary/70" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Daily Log ──────────────────────────────────────────────────────────────
function DailyLogView({ currentUser, logs, setLogs, months }: {
  currentUser: UserRecord; logs: DailyLog[]; setLogs: (l: DailyLog[]) => void; months: MonthRecord[];
}) {
  const activeMonth = getActiveMonth(months);
  const today = new Date().getDate();
  const [selectedDay, setSelectedDay] = useState(today);

  const selectedDate = dateKey(activeMonth, selectedDay);

  const toggle = (practiceId: string) => {
    const exists = logs.some((l) => l.userId === currentUser.id && l.practiceId === practiceId && l.date === selectedDate);
    if (exists) {
      setLogs(logs.filter((l) => !(l.userId === currentUser.id && l.practiceId === practiceId && l.date === selectedDate)));
    } else {
      setLogs([...logs, { userId: currentUser.id, date: selectedDate, practiceId, completed: true }]);
    }
  };

  const isDone = (practiceId: string) =>
    logs.some((l) => l.userId === currentUser.id && l.practiceId === practiceId && l.date === selectedDate && l.completed);

  // Days that have at least one log (for calendar dots)
  const markedDays = useMemo(() => {
    const s = new Set<number>();
    logs.filter((l) => l.userId === currentUser.id && l.date.startsWith(`${activeMonth.year}-${String(activeMonth.month).padStart(2,"0")}`))
      .forEach((l) => s.add(parseInt(l.date.slice(-2), 10)));
    return s;
  }, [logs, currentUser.id, activeMonth]);

  const totalDone = PRACTICES.filter((p) => isDone(p.id)).length;
  const isToday = selectedDay === today;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-primary font-semibold mb-1">{activeMonth.label}</p>
          <h1 className="text-3xl font-light text-foreground mb-1" style={{ fontFamily: "'Crimson Pro', serif" }}>Daily Record</h1>
          <p className="text-sm text-muted-foreground">
            {isToday ? "Today — " : ""}
            {new Date(activeMonth.year, activeMonth.month - 1, selectedDay).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {!isToday && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/20 self-start md:self-auto animate-pulse">
            Editing Day {selectedDay}
          </span>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left column: Calendar & stats */}
        <div className="w-full lg:w-64 shrink-0 space-y-4">
          <DayPicker month={activeMonth} selectedDay={selectedDay} onChange={setSelectedDay} markedDays={markedDays} />
          
          <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
            <p className="text-3xl font-mono font-semibold text-primary">{markedDays.size}</p>
            <p className="text-xs text-muted-foreground mt-1">days logged this month</p>
          </div>
        </div>

        {/* Right column: Checklist & details */}
        <div className="flex-1 w-full space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Done today", value: `${totalDone} / ${PRACTICES.length}`, icon: CheckCircle, col: "text-primary" },
              { label: "Day of month", value: `${selectedDay} / ${activeMonth.days}`, icon: Calendar, col: "text-primary/70" },
              { label: "Days left", value: `${activeMonth.days - today}`, icon: Clock, col: "text-muted-foreground" },
            ].map(({ label, value, icon: Icon, col }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <Icon className={`w-4 h-4 ${col} mb-2`} />
                <p className="text-lg font-mono font-semibold text-foreground leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* Practice List Header */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-secondary/20 flex items-center justify-between">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">Practices Checklist</p>
              <p className="text-xs text-muted-foreground font-mono">Click cards to toggle</p>
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {PRACTICES.map((p) => {
                const done = isDone(p.id);
                const monthDays = completedDays(logs, currentUser.id, p.id, activeMonth);
                const progress = pct(monthDays, p.target);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={`p-3.5 border rounded-xl flex items-start gap-4 transition-all select-none cursor-pointer duration-200 hover:-translate-y-[1px]
                      ${done 
                        ? "bg-primary/5 border-primary/40 shadow-sm" 
                        : "bg-card border-border/80 hover:border-primary/30 hover:bg-secondary/20"}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200
                        ${done 
                          ? "bg-primary text-primary-foreground border-primary scale-105" 
                          : "border-muted-foreground/30 bg-transparent"}`}
                      >
                        {done && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    
                    <span className="text-xl shrink-0 leading-none select-none mt-0.5">{p.icon}</span>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-snug transition-colors
                        ${done ? "text-foreground font-semibold" : "text-muted-foreground/90 font-medium"}`}>
                        {p.name}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1">
                          <ProgressBar value={progress} size="sm" />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground/75 font-semibold whitespace-nowrap">
                          {monthDays} / {p.target}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Progress View ──────────────────────────────────────────────────────────
function ProgressView({ currentUser, logs, months }: { currentUser: UserRecord; logs: DailyLog[]; months: MonthRecord[] }) {
  const activeMonth = getActiveMonth(months);
  const chartData = PRACTICES.map((p) => {
    const done = completedDays(logs, currentUser.id, p.id, activeMonth);
    return { id: p.id, name: getShortPracticeName(p.name), done, target: p.target, pct: pct(done, p.target), icon: p.icon };
  });
  const overall = Math.round(chartData.reduce((s, d) => s + d.pct, 0) / chartData.length);
  const met = chartData.filter((d) => d.pct >= 100).length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary font-semibold mb-1">{activeMonth.label}</p>
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>My Progress</h1>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Overall completion", value: `${overall}%`, col: "text-primary" },
          { label: "Targets met", value: `${met} / ${PRACTICES.length}`, col: "text-foreground" },
          { label: "Days logged", value: `${new Set(logsForMonth(logs, currentUser.id, activeMonth).map((l) => l.date)).size} days`, col: "text-foreground" },
        ].map(({ label, value, col }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <p className={`text-3xl font-mono font-semibold ${col}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">{label}</p>
          </div>
        ))}
      </div>
      
      {/* Recharts Chart */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold mb-4">Days completed vs. target</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barSize={12} barGap={4} margin={{ bottom: 45, left: -10, right: 10, top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.4} />
            <XAxis 
              dataKey="name" 
              tick={{ fill: "var(--muted-foreground)", fontSize: 8.5 }} 
              angle={-45} 
              textAnchor="end" 
              interval={0}
              height={55}
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} axisLine={false} tickLine={false} width={24} />
            <Tooltip 
              contentStyle={{ 
                background: "var(--card)", 
                border: "1px solid var(--border)", 
                borderRadius: 8, 
                fontSize: 11, 
                fontFamily: "Plus Jakarta Sans", 
                color: "var(--foreground)" 
              }} 
              cursor={{ fill: "var(--secondary)", opacity: 0.15 }} 
            />
            <Bar dataKey="target" fill="var(--secondary)" opacity={0.5} radius={[3,3,0,0]} name="Target" />
            <Bar dataKey="done"   fill="var(--primary)"   radius={[3,3,0,0]} name="Completed" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Practice breakdown */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-secondary/20">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">Practice Breakdown</p>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {chartData.map((d) => {
            const pInfo = PRACTICES.find((p) => p.id === d.id) || PRACTICES[0];
            return (
              <div key={d.id} className="p-3.5 border border-border/70 rounded-xl bg-card hover:bg-secondary/15 transition-colors flex items-center gap-4">
                <span className="text-xl shrink-0 leading-none">{pInfo.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1.5">
                    <p className="text-sm font-semibold text-foreground truncate">{pInfo.name}</p>
                    <span className="text-xs font-mono text-muted-foreground font-semibold">{d.done} / {d.target}</span>
                  </div>
                  <ProgressBar value={d.pct} />
                </div>
                <span className={`text-xs font-mono font-semibold w-10 text-right shrink-0
                  ${d.pct >= 80 ? "text-emerald-500" : d.pct >= 50 ? "text-primary" : "text-destructive"}`}>
                  {d.pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Analytics View ─────────────────────────────────────────────────────────
function AnalyticsView({ currentUser, logs, allUsers, months, onNavigateToPrint }: {
  currentUser: UserRecord; logs: DailyLog[]; allUsers: UserRecord[]; months: MonthRecord[];
  onNavigateToPrint: (userId: string, monthId: string, fromView: string) => void;
}) {
  const canViewOthers = currentUser.role === "coordinator" || currentUser.role === "admin";

  // Accessible users for "view as"
  const viewableUsers = canViewOthers
    ? currentUser.role === "admin"
      ? allUsers.filter((u) => u.role === "user" || u.role === "coordinator")
      : allUsers.filter((u) => u.coordinatorId === currentUser.id)
    : [];

  const [viewUserId, setViewUserId] = useState(currentUser.id);
  const activeMonth = getActiveMonth(months);
  const [selectedMonthId, setSelectedMonthId] = useState(activeMonth.id);

  const subject = allUsers.find((u) => u.id === viewUserId) ?? currentUser;
  const month = months.find((m) => m.id === selectedMonthId) || getActiveMonth(months);

  // Heatmap: day × practice grid
  const heatmapData = useMemo(() => {
    return Array.from({ length: month.days }, (_, i) => {
      const day = i + 1;
      const date = dateKey(month, day);
      const row: Record<string, any> = { day };
      PRACTICES.forEach((p) => {
        row[p.id] = logs.some((l) => l.userId === subject.id && l.date === date && l.practiceId === p.id && l.completed);
      });
      row.count = PRACTICES.filter((p) => row[p.id]).length;
      return row;
    });
  }, [logs, subject.id, month]);

  // Daily completion count trend
  const trendData = heatmapData.map((r) => ({ day: r.day, completed: r.count }));

  // Per-practice summary
  const summaryData = PRACTICES.map((p) => ({
    ...p,
    done: completedDays(logs, subject.id, p.id, month),
    progress: pct(completedDays(logs, subject.id, p.id, month), p.target),
  }));

  const lowestPractices = useMemo(() => {
    return [...summaryData].sort((a, b) => a.progress - b.progress).slice(0, 5);
  }, [summaryData]);

  const highestPractices = useMemo(() => {
    return [...summaryData].sort((a, b) => b.progress - a.progress).slice(0, 5);
  }, [summaryData]);

  const overall = Math.round(summaryData.reduce((s, d) => s + d.progress, 0) / summaryData.length);
  const streak = useMemo(() => {
    let s = 0;
    for (let d = month.days; d >= 1; d--) {
      const date = dateKey(month, d);
      const hasAny = logs.some((l) => l.userId === subject.id && l.date === date && l.completed);
      if (hasAny) s++; else break;
    }
    return s;
  }, [logs, subject.id, month]);

  return (
    <div id="user-report-pdf-content" className="max-w-5xl mx-auto px-6 py-8">
      {/* Header + controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-primary font-semibold mb-1">Analytics</p>
          <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
            {subject.id === currentUser.id ? "My Analytics" : `${subject.name.split(" ")[0]}'s Analytics`}
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 bg-background/5 p-1 rounded-xl">
          {/* Download PDF button */}
          <button
            onClick={() => onNavigateToPrint(viewUserId, selectedMonthId, "analytics")}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/95 transition-all shadow-sm shadow-primary/20 no-pdf cursor-pointer animate-in fade-in duration-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          {/* Month picker */}
          <div className="relative no-pdf">
            <select
              value={selectedMonthId}
              onChange={(e) => setSelectedMonthId(e.target.value)}
              className="appearance-none bg-card border border-border rounded-xl px-4 py-2 text-xs font-mono text-foreground pr-8 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer shadow-sm"
            >
              {months.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* User picker (coord/admin only) */}
          {canViewOthers && (
            <div className="relative no-pdf">
              <select
                value={viewUserId}
                onChange={(e) => setViewUserId(e.target.value)}
                className="appearance-none bg-card border border-border rounded-xl px-4 py-2 text-xs font-mono text-foreground pr-8 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer shadow-sm"
              >
                <option value={currentUser.id}>Myself</option>
                {viewableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Viewing other user banner */}
      {subject.id !== currentUser.id && (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 shadow-sm">
          <AvatarBadge initials={subject.avatar} size="sm" role={subject.role} />
          <p className="text-xs text-muted-foreground font-medium">
            Currently viewing logs for <span className="text-foreground font-semibold">{subject.name}</span> — {month.label}
          </p>
          <button 
            onClick={() => setViewUserId(currentUser.id)} 
            className="ml-auto text-xs text-primary hover:underline transition-colors font-mono font-semibold no-pdf"
          >
            Back to mine
          </button>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Overall", value: `${overall}%`, col: overall >= 75 ? "text-emerald-500" : overall >= 50 ? "text-primary" : "text-destructive" },
          { label: "Current streak", value: `${streak} days`, col: "text-primary" },
          { label: "Days logged", value: `${new Set(logs.filter((l) => l.userId === subject.id && l.date.startsWith(`${month.year}-${String(month.month).padStart(2,"0")}`)).map((l) => l.date)).size} days`, col: "text-foreground" },
          { label: "Targets met", value: `${summaryData.filter((d) => d.progress >= 100).length} / ${PRACTICES.length}`, col: "text-foreground" },
        ].map(({ label, value, col }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <p className={`text-2xl font-mono font-semibold ${col}`}>{value}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Daily trend chart */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold mb-4">Daily practice count — {month.label}</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.4} />
            <XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} interval={4} />
            <YAxis domain={[0, PRACTICES.length]} tick={{ fill: "var(--muted-foreground)", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={20} />
            <Tooltip 
              contentStyle={{ 
                background: "var(--card)", 
                border: "1px solid var(--border)", 
                borderRadius: 8, 
                fontSize: 11, 
                fontFamily: "Plus Jakarta Sans", 
                color: "var(--foreground)" 
              }} 
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }} 
            />
            <Line type="monotone" dataKey="completed" stroke="var(--primary)" strokeWidth={2} dot={false} name="Completed" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Overview Bar Chart */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">Grafik Capaian Bulanan (Semua Amalan)</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Perbandingan realisasi vs target untuk semua amalan pada bulan {month.label}</p>
          </div>
          <div className="flex gap-3 text-[10px] font-mono text-muted-foreground no-pdf">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span>Realisasi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-secondary/80" />
              <span>Target</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={summaryData.map(d => ({ name: getShortPracticeName(d.name), done: d.done, target: d.target }))} barSize={12} barGap={4} margin={{ bottom: 45, left: -20, right: 10, top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.4} />
            <XAxis 
              dataKey="name" 
              tick={{ fill: "var(--muted-foreground)", fontSize: 8.5 }} 
              angle={-45} 
              textAnchor="end" 
              interval={0}
              height={55}
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} axisLine={false} tickLine={false} width={24} />
            <Tooltip 
              contentStyle={{ 
                background: "var(--card)", 
                border: "1px solid var(--border)", 
                borderRadius: 8, 
                fontSize: 11, 
                fontFamily: "Plus Jakarta Sans", 
                color: "var(--foreground)" 
              }} 
              cursor={{ fill: "var(--secondary)", opacity: 0.15 }} 
            />
            <Bar dataKey="target" fill="var(--secondary)" opacity={0.4} radius={[2,2,0,0]} name="Target" />
            <Bar dataKey="done" fill="var(--primary)" radius={[2,2,0,0]} name="Realisasi" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 5 Lowest and 5 Highest practices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* 5 Lowest Practices */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-destructive/[0.04] flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-widest text-destructive font-bold">5 Amalan Terendah (Butuh Perhatian)</p>
            <span className="text-[10px] font-mono text-destructive/80 font-bold uppercase">Evaluasi</span>
          </div>
          <div className="p-4 space-y-3">
            {lowestPractices.map((d) => (
              <div key={d.id} className="p-3 border border-border/80 rounded-xl bg-card hover:bg-secondary/15 transition-colors flex items-center gap-3.5">
                <span className="text-xl shrink-0 leading-none select-none">{d.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-semibold text-foreground truncate">{d.name}</p>
                    <span className="text-[10px] font-mono text-muted-foreground font-semibold">{d.done} / {d.target} hari</span>
                  </div>
                  <ProgressBar value={d.progress} size="sm" />
                </div>
                <span className="text-xs font-mono font-bold text-destructive w-10 text-right shrink-0">{d.progress}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5 Highest Practices */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-emerald-500/[0.04] flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-widest text-emerald-500 font-bold">5 Amalan Tertinggi (Sangat Baik)</p>
            <span className="text-[10px] font-mono text-emerald-500/80 font-bold uppercase">Apresiasi</span>
          </div>
          <div className="p-4 space-y-3">
            {highestPractices.map((d) => (
              <div key={d.id} className="p-3 border border-border/80 rounded-xl bg-card hover:bg-secondary/15 transition-colors flex items-center gap-3.5">
                <span className="text-xl shrink-0 leading-none select-none">{d.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-semibold text-foreground truncate">{d.name}</p>
                    <span className="text-[10px] font-mono text-muted-foreground font-semibold">{d.done} / {d.target} hari</span>
                  </div>
                  <ProgressBar value={d.progress} size="sm" />
                </div>
                <span className="text-xs font-mono font-bold text-emerald-500 w-10 text-right shrink-0">{d.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap: practices × days */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6 shadow-sm">
        <div className="px-5 py-4 border-b border-border bg-secondary/20">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">Practice heatmap — each cell = one day</p>
        </div>
        <div className="p-5 overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          <div className="min-w-max">
            {/* Day numbers header */}
            <div className="flex gap-[3px] mb-1.5 pl-28">
              {heatmapData.map((r) => (
                <div key={r.day} className="w-[18px] text-center text-[9px] font-mono text-muted-foreground/60 font-semibold">{r.day % 5 === 0 ? r.day : ""}</div>
              ))}
            </div>
            {PRACTICES.map((p) => (
              <div key={p.id} className="flex items-center gap-2 mb-1.5">
                <span className="text-base w-5 text-center shrink-0">{p.icon}</span>
                <span className="text-[10px] font-mono text-muted-foreground w-20 truncate shrink-0">{p.name.split(" ")[0]}</span>
                <div className="flex gap-[3px]">
                  {heatmapData.map((r) => {
                    const done = r[p.id] as boolean;
                    return (
                      <div
                        key={r.day}
                        title={`Day ${r.day}: ${done ? "Done" : "Not done"}`}
                        className={`w-[18px] h-[18px] rounded-[3px] transition-colors duration-200
                          ${done 
                            ? "bg-primary/80 hover:bg-primary" 
                            : "bg-secondary/40 hover:bg-secondary/60"}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly targets breakdown */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-secondary/20">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">Monthly Targets Progress</p>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {summaryData.map((d) => (
            <div key={d.id} className="p-3.5 border border-border/70 rounded-xl bg-card hover:bg-secondary/15 transition-colors flex items-center gap-4">
              <span className="text-xl shrink-0 leading-none">{d.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1.5">
                  <p className="text-sm font-semibold text-foreground truncate">{d.name}</p>
                  <span className="text-xs font-mono text-muted-foreground font-semibold">{d.done} / {d.target} days</span>
                </div>
                <ProgressBar value={d.progress} />
              </div>
              <span className={`text-xs font-mono font-semibold w-10 text-right shrink-0
                ${d.progress >= 80 ? "text-emerald-500" : d.progress >= 50 ? "text-primary" : "text-destructive"}`}>
                {d.progress}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Peers View ─────────────────────────────────────────────────────────────
function PeersView({ currentUser, logs, allUsers, months, notifications, setNotifications }: { 
  currentUser: UserRecord; 
  logs: DailyLog[]; 
  allUsers: UserRecord[]; 
  months: MonthRecord[];
  notifications: Notification[];
  setNotifications: (n: Notification[]) => void;
}) {
  const activeMonth = getActiveMonth(months);
  const peers = allUsers.filter((u) => u.role === "user" && u.id !== currentUser.id);
  const sorted = [...peers].sort((a, b) => overallPct(logs, b.id, activeMonth) - overallPct(logs, a.id, activeMonth));

  const [searchQuery, setSearchQuery] = useState("");
  const [cheeredUsers, setCheeredUsers] = useState<Record<string, boolean>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const filtered = sorted.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleCheer = (peerId: string) => {
    const newNotif = {
      id: `n_cheer_${Date.now()}_${peerId}`,
      fromId: currentUser.id,
      toId: peerId,
      message: `MasyaAllah! ${currentUser.name} mengirimkan Anda apresiasi atas konsistensi ibadah Anda. Tetap semangat ya! 🌟✨`,
      sentAt: new Date().toISOString(),
      read: false
    };
    setNotifications([...notifications, newNotif]);
    setCheeredUsers(prev => ({ ...prev, [peerId]: true }));
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <span className="text-xl" title="1st Place">🥇</span>;
    if (index === 1) return <span className="text-xl" title="2nd Place">🥈</span>;
    if (index === 2) return <span className="text-xl" title="3rd Place">🥉</span>;
    return <span className="text-xs font-mono text-muted-foreground/60 w-6 text-center font-bold">{index + 1}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header and description */}
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary font-semibold mb-1">Community Hub</p>
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>Fellow Practitioners</h1>
        <p className="text-sm text-muted-foreground mt-1">Mutual visibility for motivation — may Allah bless and strengthen everyone's efforts.</p>
      </div>

      {/* Interactive Search Bar */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder="Search practitioners by name..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/45 shadow-sm"
        />
      </div>

      {/* Members Feed List */}
      <div className="space-y-4">
        {filtered.map((peer, idx) => {
          const overall = overallPct(logs, peer.id, activeMonth);
          const todayDate = dateKey(activeMonth, Math.min(new Date().getDate(), activeMonth.days));
          const peerLogsToday = logs.filter(l => l.userId === peer.id && l.date === todayDate && l.completed);
          const doneTodayCount = peerLogsToday.length;
          const cheered = cheeredUsers[peer.id];
          const isExpanded = expandedUser === peer.id;
          
          return (
            <div 
              key={peer.id} 
              className="bg-card border border-border rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              {/* Summary Card Header */}
              <div 
                onClick={() => setExpandedUser(isExpanded ? null : peer.id)}
                className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-secondary/10 transition-colors"
              >
                {/* Profile Details */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-8 shrink-0 flex items-center justify-center">
                    {getRankBadge(idx)}
                  </div>
                  
                  <AvatarBadge initials={peer.avatar} size="md" />
                  
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{peer.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                      {doneTodayCount} / {PRACTICES.length} completed today
                    </p>
                  </div>
                </div>
                
                {/* Monthly Progress Bar and Actions */}
                <div className="flex items-center gap-6 self-end md:self-auto shrink-0 w-full md:w-auto justify-between md:justify-end">
                  {/* Progress bar (hidden on small devices, visible on md+) */}
                  <div className="w-40 hidden sm:block">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground font-semibold">Monthly Progress</span>
                      <span className="text-xs font-mono font-bold text-primary">{overall}%</span>
                    </div>
                    <ProgressBar value={overall} size="sm" />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Cheer Button */}
                    <button
                      disabled={cheered}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheer(peer.id);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl transition-all font-semibold shadow-sm border shrink-0
                        ${cheered 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25 cursor-default hover:scale-100" 
                          : "bg-card border-border hover:border-primary/50 hover:text-primary hover:bg-secondary/10 hover:scale-[1.02] active:scale-[0.98]"}`}
                    >
                      {cheered ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3] animate-bounce" /> Sent
                        </>
                      ) : (
                        <>
                          <span>Cheer</span> 💖
                        </>
                      )}
                    </button>

                    <div className="p-1 text-muted-foreground/60 hover:text-foreground hover:bg-secondary/40 rounded-full transition-colors">
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable Details Grid */}
              {isExpanded && (
                <div className="bg-secondary/10 border-t border-border px-5 py-5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80 font-bold mb-4">Today's Completed Practices Details</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {PRACTICES.map((p) => {
                      const done = peerLogsToday.some(l => l.practiceId === p.id);
                      return (
                        <div 
                          key={p.id} 
                          className={`border rounded-xl p-3 text-center transition-all duration-200
                            ${done 
                              ? "bg-primary/5 border-primary/30 shadow-xs" 
                              : "bg-card border-border/40 opacity-40 grayscale"}`}
                        >
                          <span className="text-xl leading-none select-none block mb-1.5">{p.icon}</span>
                          <p className="text-[11px] font-semibold text-foreground truncate px-1" title={p.name}>{p.name}</p>
                          <span className="text-[9px] font-mono text-muted-foreground mt-1.5 block">
                            {done ? "Completed ✓" : "Not yet"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {filtered.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-8 text-center shadow-xs">
            <p className="text-sm text-muted-foreground font-medium">No practitioners match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Notifications ──────────────────────────────────────────────────────────
function NotificationsView({ currentUser, notifications, setNotifications, allUsers }: {
  currentUser: UserRecord; notifications: Notification[]; setNotifications: (n: Notification[]) => void; allUsers: UserRecord[];
}) {
  const mine = notifications.filter((n) => n.toId === currentUser.id);
  const markRead = (id: string) => setNotifications(notifications.map((n) => n.id === id ? { ...n, read: true } : n));
  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Inbox</p>
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>Notifications</h1>
      </div>
      {mine.length === 0 ? (
        <div className="bg-card border border-border rounded p-8 text-center">
          <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mine.map((n) => {
            const from = allUsers.find((u) => u.id === n.fromId);
            return (
              <div key={n.id} className={`bg-card border rounded-lg p-5 transition-all ${n.read ? "border-border opacity-60" : "border-primary/20"}`}>
                <div className="flex items-start gap-3">
                  {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AvatarBadge initials={from?.avatar || "?"} size="sm" role={from?.role} />
                      <div>
                        <p className="text-xs font-medium text-foreground">{from?.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {new Date(n.sentAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{n.message}</p>
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="mt-3 text-xs text-muted-foreground hover:text-primary transition-colors font-mono">Mark as read</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Group View ─────────────────────────────────────────────────────────────
function GroupView({ currentUser, logs, notifications, setNotifications, allUsers, months }: {
  currentUser: UserRecord; logs: DailyLog[]; notifications: Notification[]; setNotifications: (n: Notification[]) => void; allUsers: UserRecord[]; months: MonthRecord[];
}) {
  const activeMonth = getActiveMonth(months);
  const members = allUsers.filter((u) => u.role === "user");
  
  const [sendTo, setSendTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const sendNotification = () => {
    if (!sendTo || !message.trim()) return;
    setNotifications([...notifications, { id: `n${Date.now()}`, fromId: currentUser.id, toId: sendTo, message: message.trim(), sentAt: new Date().toISOString(), read: false }]);
    setMessage(""); setSendTo(null);
  };

  const atRisk = members.filter((u) => overallPct(logs, u.id, activeMonth) < 60);

  const presets = [
    { label: "✨ Remind Log", text: "Assalamu'alaikum, just a friendly reminder to log your daily practices today. Semoga istiqomah! ✨" },
    { label: "💪 Keep It Up", text: "MasyaAllah, great effort! Let's keep up the spirit and meet all your weekly targets! 💪" },
    { label: "⚠️ Low Progress", text: "Assalamu'alaikum, you are doing great, but some of your practices are below target. Let me know if you need any help! 🕌" }
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary font-semibold mb-1">Coordinator Dashboard</p>
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>My Group</h1>
        <p className="text-sm text-muted-foreground mt-1">{members.length} members under your care</p>
      </div>

      {atRisk.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm animate-pulse">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Attention Needed</p>
            <p className="text-xs text-destructive/80 mt-1">
              <span className="font-semibold">{atRisk.map((u) => u.name.split(" ")[0]).join(", ")}</span> {atRisk.length === 1 ? "is" : "are"} below 60% completion rate this month. Consider sending them a friendly reminder.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Header container */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-secondary/20 flex justify-between items-center">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">Member Overview — {activeMonth.label}</p>
            <span className="text-xs font-mono text-muted-foreground font-semibold">{members.length} members</span>
          </div>

          <div className="divide-y divide-border">
            {members.map((member) => {
              const overall = overallPct(logs, member.id, activeMonth);
              const isExpanded = expandedUser === member.id;
              
              // Status Badge configuration
              let statusText = "On Track";
              let statusClass = "bg-primary/10 text-primary border-primary/25";
              if (overall < 60) {
                statusText = "At Risk";
                statusClass = "bg-destructive/10 text-destructive border-destructive/25";
              } else if (overall >= 85) {
                statusText = "Excellent";
                statusClass = "bg-emerald-500/10 text-emerald-500 border-emerald-500/25";
              }

              return (
                <div key={member.id} className="transition-all duration-200">
                  {/* Summary Header */}
                  <div 
                    onClick={() => setExpandedUser(isExpanded ? null : member.id)}
                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <AvatarBadge initials={member.avatar} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold uppercase tracking-wider border ${statusClass}`}>
                            {statusText}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate font-medium">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 self-end sm:self-auto shrink-0">
                      <div className="text-right hidden xs:block">
                        <p className="text-sm font-mono font-semibold text-foreground">{overall}%</p>
                        <p className="text-[10px] text-muted-foreground font-medium">overall logs</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSendTo(member.id);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-xl hover:border-primary/50 hover:text-primary hover:bg-card transition-all font-semibold shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" /> Remind
                        </button>
                        
                        <div className="p-1 text-muted-foreground/60 hover:text-foreground hover:bg-secondary/40 rounded-full transition-colors">
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Details */}
                  {isExpanded && (
                    <div className="bg-secondary/10 border-t border-border px-5 py-5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80 font-bold mb-4">Detailed Practice Progress</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {PRACTICES.map((p) => {
                          const done = completedDays(logs, member.id, p.id, activeMonth);
                          const progress = pct(done, p.target);
                          return (
                            <div key={p.id} className="bg-card border border-border/60 rounded-xl p-3 text-center shadow-xs">
                              <span className="text-xl leading-none select-none block mb-1.5">{p.icon}</span>
                              <p className="text-[11px] font-semibold text-foreground truncate px-1" title={p.name}>{p.name}</p>
                              
                              <div className="my-2.5 px-1">
                                <ProgressBar value={progress} size="sm" />
                              </div>
                              
                              <p className="text-[10px] font-mono text-muted-foreground/85 font-semibold">{done} / {p.target}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sendTo && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Send reminder to</p>
                <p className="text-sm font-semibold text-foreground">{allUsers.find((u) => u.id === sendTo)?.name}</p>
              </div>
              <button 
                onClick={() => { setSendTo(null); setMessage(""); }} 
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Write your custom reminder message or choose a template below…" 
              rows={4}
              className="w-full bg-secondary border border-border rounded-xl p-3.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/45 transition-colors" 
            />

            {/* Presets List */}
            <div className="mt-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 font-semibold mb-2">Message Templates</p>
              <div className="flex flex-col gap-1.5">
                {presets.map((p, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setMessage(p.text)}
                    className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-primary bg-secondary/40 border border-border/50 rounded-lg hover:border-primary/30 transition-all font-medium truncate"
                  >
                    {p.label}: "{p.text}"
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button 
                onClick={() => { setSendTo(null); setMessage(""); }} 
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-muted-foreground border border-border hover:bg-secondary/50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={sendNotification} 
                disabled={!message.trim()} 
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm shadow-primary/20 transition-all disabled:opacity-40"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin: Users ───────────────────────────────────────────────────────────
function AdminUsers({ users, setUsers }: { users: UserRecord[]; setUsers: (u: UserRecord[]) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "user" as Role });
  const [editRole, setEditRole] = useState<{ userId: string; role: Role } | null>(null);
  const addUser = () => {
    if (!form.name || !form.email) return;
    const initials = form.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    setUsers([...users, { id: `u${Date.now()}`, ...form, avatar: initials }]);
    setForm({ name: "", email: "", role: "user" }); setShowAdd(false);
  };
  const changeRole = () => {
    if (!editRole) return;
    setUsers(users.map((u) => u.id === editRole.userId ? { ...u, role: editRole.role } : u));
    setEditRole(null);
  };
  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Administration</p>
          <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>User Management</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add user
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Members", value: users.filter((u) => u.role === "user").length },
          { label: "Coordinators", value: users.filter((u) => u.role === "coordinator").length },
          { label: "Admins", value: users.filter((u) => u.role === "admin").length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded p-4">
            <p className="text-2xl font-mono font-medium text-primary">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">All accounts ({users.length})</p>
        </div>
        {users.map((user) => {
          const coord = users.find((c) => c.id === user.coordinatorId);
          return (
            <div key={user.id} className="px-5 py-3.5 border-b border-border last:border-0 flex items-center gap-3">
              <AvatarBadge initials={user.avatar} role={user.role} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <RolePill role={user.role} />
                </div>
                <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
                {coord && <p className="text-xs text-muted-foreground">Coord: {coord.name}</p>}
              </div>
              <button onClick={() => setEditRole({ userId: user.id, role: user.role })}
                className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono flex items-center gap-1">
                Change role <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
      {showAdd && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-card border border-border rounded-lg w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-foreground mb-4" style={{ fontFamily: "'Crimson Pro', serif" }}>Add new user</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name"
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors" />
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address"
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors" />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors">
                <option value="user">Member</option>
                <option value="coordinator">Coordinator</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 text-sm text-muted-foreground border border-border rounded hover:bg-secondary/50 transition-colors">Cancel</button>
              <button onClick={addUser} className="flex-1 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Add</button>
            </div>
          </div>
        </div>
      )}
      {editRole && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-card border border-border rounded-lg w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-foreground mb-1" style={{ fontFamily: "'Crimson Pro', serif" }}>Change role</h3>
            <p className="text-xs text-muted-foreground mb-4">{users.find((u) => u.id === editRole.userId)?.name}</p>
            <select value={editRole.role} onChange={(e) => setEditRole({ ...editRole, role: e.target.value as Role })}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 mb-4 transition-colors">
              <option value="user">Member</option>
              <option value="coordinator">Coordinator</option>
              <option value="admin">Administrator</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setEditRole(null)} className="flex-1 py-2 text-sm text-muted-foreground border border-border rounded hover:bg-secondary/50 transition-colors">Cancel</button>
              <button onClick={changeRole} className="flex-1 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin: Months ──────────────────────────────────────────────────────────
function AdminMonths({ months, setMonths }: { months: MonthRecord[]; setMonths: (m: MonthRecord[]) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ monthStr: "January", year: 2025, month: 1, days: 31 });
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const addMonth = () => {
    const label = `${form.monthStr} ${form.year}`;
    setMonths([...months, { id: `m${Date.now()}`, label, year: form.year, month: form.month, days: form.days, active: false }]);
    setShowAdd(false);
  };
  const setActive = (id: string) => setMonths(months.map((m) => ({ ...m, active: m.id === id })));
  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Administration</p>
          <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>Month Records</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add month
        </button>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {months.map((m) => (
          <div key={m.id} className={`px-5 py-4 border-b border-border last:border-0 flex items-center gap-4 ${m.active ? "bg-primary/5" : ""}`}>
            <Calendar className={`w-4 h-4 ${m.active ? "text-primary" : "text-muted-foreground"}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{m.label}</p>
              <p className="text-xs font-mono text-muted-foreground">{m.days} days · Year {m.year} · Month {m.month}</p>
            </div>
            {m.active ? (
              <span className="text-xs font-mono uppercase tracking-wider text-primary border border-primary/30 px-2 py-0.5 rounded">Active</span>
            ) : (
              <button onClick={() => setActive(m.id)} className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono">Set active</button>
            )}
          </div>
        ))}
      </div>
      {showAdd && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-card border border-border rounded-lg w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-foreground mb-4" style={{ fontFamily: "'Crimson Pro', serif" }}>Add new month</h3>
            <div className="space-y-3">
              <select value={form.month} onChange={(e) => {
                  const m = +e.target.value;
                  setForm({ ...form, month: m, monthStr: monthNames[m - 1] });
                }}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors">
                {monthNames.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })} placeholder="Year"
                  className="bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors" />
                <input type="number" min={28} max={31} value={form.days} onChange={(e) => setForm({ ...form, days: +e.target.value })} placeholder="Days"
                  className="bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 text-sm text-muted-foreground border border-border rounded hover:bg-secondary/50 transition-colors">Cancel</button>
              <button onClick={addMonth} className="flex-1 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin: Reports ─────────────────────────────────────────────────────────
function AdminReports({ users, logs, months, notifications, onNavigateToPrint }: { 
  users: UserRecord[]; 
  logs: DailyLog[]; 
  months: MonthRecord[]; 
  notifications: Notification[];
  onNavigateToPrint: (userId: string | null, monthId: string, fromView: string) => void;
}) {
  const [selectedMonthId, setSelectedMonthId] = useState(getActiveMonth(months).id);
  const month = months.find((m) => m.id === selectedMonthId) || getActiveMonth(months);
  const members = users.filter((u) => u.role === "user");
  const coordinators = users.filter((u) => u.role === "coordinator");

  // Get last 7 days of the selected month
  const last7Days = Array.from({ length: 7 }, (_, i) => Math.max(1, month.days - i)).map(d => dateKey(month, d));

  const getWeeklyPct = (userId: string) => {
    const done = logs.filter(l => l.userId === userId && last7Days.includes(l.date) && l.completed).length;
    return Math.round((done / (7 * PRACTICES.length)) * 100) || 0;
  };

  const getReminders = (userId: string) => notifications.filter(n => n.toId === userId).length;

  const practiceStats = useMemo(() => {
    return PRACTICES.map((p) => {
      const avg = members.reduce((s, u) => s + completedDays(logs, u.id, p.id, month), 0) / (members.length || 1);
      return { name: p.name, icon: p.icon, avg: Math.round(avg), target: p.target, progress: pct(Math.round(avg), p.target) };
    });
  }, [members, logs, month]);

  const weeklyTrendData = useMemo(() => {
    if (members.length === 0) return [];
    
    // Divide the month into 4 periods
    const periods = [
      { label: "Week 1 (1-7)", start: 1, end: 7 },
      { label: "Week 2 (8-14)", start: 8, end: 14 },
      { label: "Week 3 (15-21)", start: 15, end: 21 },
      { label: "Week 4 (22+)", start: 22, end: month.days }
    ];

    return periods.map(p => {
      const weekDays = Array.from({ length: p.end - p.start + 1 }, (_, i) => dateKey(month, p.start + i));
      const totalPossible = (p.end - p.start + 1) * PRACTICES.length * members.length;
      const completed = logs.filter(l => 
        members.some(m => m.id === l.userId) && 
        weekDays.includes(l.date) && 
        l.completed
      ).length;
      
      const average = totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0;
      return { name: p.label, Adherence: average };
    });
  }, [members, logs, month]);

  // Overall Community Stats
  const overallCommunityAvg = useMemo(() => {
    if (members.length === 0) return 0;
    const sum = members.reduce((s, u) => s + overallPct(logs, u.id, month), 0);
    return Math.round(sum / members.length);
  }, [members, logs, month]);

  const totalRemindersThisMonth = useMemo(() => {
    return notifications.filter(n => {
      const date = new Date(n.sentAt);
      return date.getFullYear() === month.year && (date.getMonth() + 1) === month.month;
    }).length;
  }, [notifications, month]);

  // 1. Practice sorting state
  const [practiceSort, setPracticeSort] = useState<"default" | "lowest" | "highest">("default");
  
  const sortedPracticeStats = useMemo(() => {
    const stats = [...practiceStats];
    if (practiceSort === "lowest") return stats.sort((a, b) => a.progress - b.progress);
    if (practiceSort === "highest") return stats.sort((a, b) => b.progress - a.progress);
    return stats;
  }, [practiceStats, practiceSort]);

  // 2. Members search & filter states
  const [memberSearch, setMemberSearch] = useState("");
  const [coordFilter, setCoordFilter] = useState("all");
  const [perfFilter, setPerfFilter] = useState("all");

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(memberSearch.toLowerCase().trim());
      const matchesCoord = coordFilter === "all" || m.coordinatorId === coordFilter;
      const overall = overallPct(logs, m.id, month);
      let matchesPerf = true;
      if (perfFilter === "high") matchesPerf = overall >= 80;
      else if (perfFilter === "average") matchesPerf = overall >= 50 && overall < 80;
      else if (perfFilter === "low") matchesPerf = overall < 50;

      return matchesSearch && matchesCoord && matchesPerf;
    });
  }, [members, memberSearch, coordFilter, perfFilter, logs, month]);

  // 3. Notifications search & filter states
  const [notifSearch, setNotifSearch] = useState("");
  const [notifStatus, setNotifStatus] = useState("all");

  const filteredNotifications = useMemo(() => {
    const sorted = notifications.slice().reverse();
    return sorted.filter(n => {
      const fromName = users.find(u => u.id === n.fromId)?.name || "Unknown";
      const toName = users.find(u => u.id === n.toId)?.name || "Unknown";
      const matchesSearch = 
        fromName.toLowerCase().includes(notifSearch.toLowerCase().trim()) ||
        toName.toLowerCase().includes(notifSearch.toLowerCase().trim()) ||
        n.message.toLowerCase().includes(notifSearch.toLowerCase().trim());
      
      const matchesStatus = 
        notifStatus === "all" ||
        (notifStatus === "read" && n.read) ||
        (notifStatus === "unread" && !n.read);

      return matchesSearch && matchesStatus;
    });
  }, [notifications, users, notifSearch, notifStatus]);

  return (
    <div id="admin-report-pdf-content" className="max-w-5xl mx-auto px-6 py-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-primary font-semibold mb-1">Administration Panel</p>
          <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>Monthly Reports</h1>
        </div>
        
        <div className="relative flex items-center gap-2">
          {/* Download PDF button */}
          <button
            onClick={() => onNavigateToPrint(null, selectedMonthId, "admin-reports")}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/95 transition-all shadow-sm shadow-primary/20 no-pdf cursor-pointer mr-1 animate-in fade-in duration-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          <SlidersHorizontal className="w-4 h-4 text-muted-foreground no-pdf" />
          <div className="relative no-pdf">
            <select 
              value={selectedMonthId} 
              onChange={(e) => setSelectedMonthId(e.target.value)}
              className="appearance-none bg-card border border-border rounded-xl pl-4 pr-8 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-sm"
            >
              {months.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Community Avg</span>
            <span className="text-3xl font-light font-mono text-primary">{overallCommunityAvg}%</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Practice adherence</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Members Active</span>
            <span className="text-3xl font-light font-mono text-foreground">{members.length}</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>Registered users</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Reminders Sent</span>
            <span className="text-3xl font-light font-mono text-foreground">{totalRemindersThisMonth}</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Bell className="w-3.5 h-3.5 text-accent-foreground" />
            <span>Sent this month</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Active Period</span>
            <span className="text-base font-semibold text-foreground truncate block mt-1">{month.label}</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{month.days} Days total</span>
          </div>
        </div>
      </div>

      {/* Main stats layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Practice Averages Card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold">Community Practice Averages</p>
            <div className="flex items-center gap-1 bg-secondary/40 rounded-lg p-0.5 border border-border/50 no-pdf">
              {(["default", "lowest", "highest"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPracticeSort(mode)}
                  className={`px-2 py-1 text-[9px] font-mono rounded transition-all uppercase font-semibold ${
                    practiceSort === mode 
                      ? "bg-primary text-primary-foreground shadow-xs" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode === "default" ? "Index" : mode === "lowest" ? "Low" : "High"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {sortedPracticeStats.map((p) => {
              const needsFocus = p.progress < 50;
              return (
                <div key={p.name} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                  needsFocus ? "bg-destructive/5 border-destructive/20" : "bg-card border-transparent hover:border-border"
                }`}>
                  <span className="text-xl shrink-0 select-none leading-none">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                        {needsFocus && (
                          <span className="inline-flex px-1.5 py-0.5 text-[8px] font-mono font-bold bg-destructive/10 text-destructive border border-destructive/25 rounded-md uppercase">Needs Focus</span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground/80 shrink-0">{p.avg} / {p.target} days</span>
                    </div>
                    <ProgressBar value={p.progress} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Trend Card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold">Weekly Adherence Trend</p>
            <span className="text-[10px] font-mono bg-secondary px-2 py-0.5 rounded-md border border-border/80 text-muted-foreground">Community Trend</span>
          </div>
          <div className="flex-1 min-h-[260px] w-full mt-2">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--muted-foreground)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                />
                <YAxis 
                  stroke="var(--muted-foreground)" 
                  fontSize={10} 
                  domain={[0, 100]} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => `${v}%`}
                  tickMargin={8}
                />
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-card border border-border px-3 py-2 rounded-lg shadow-md text-[11px] font-mono">
                        <p className="text-foreground font-semibold">{payload[0].payload.name}</p>
                        <p className="text-primary font-bold mt-0.5">{payload[0].value}% Adherence</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Line 
                  type="monotone" 
                  dataKey="Adherence" 
                  stroke="var(--primary)" 
                  strokeWidth={3} 
                  activeDot={{ r: 6, stroke: "var(--background)", strokeWidth: 2 }} 
                  dot={{ r: 4, strokeWidth: 2 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Individual Records Table Card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-border bg-secondary/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold">Individual Records</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Performance tracking for selected month</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground font-semibold bg-secondary px-2.5 py-1 rounded-lg border border-border/80">
              Showing {filteredMembers.length} of {members.length} members
            </span>
          </div>
        </div>

        {/* Member filters */}
        <div className="p-4 border-b border-border bg-secondary/5 flex flex-col sm:flex-row gap-3 items-center justify-between no-pdf">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search member name..."
              className="w-full bg-card border border-border rounded-xl pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
            />
            {memberSearch && (
              <button 
                onClick={() => setMemberSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <div className="relative">
              <select
                value={coordFilter}
                onChange={(e) => setCoordFilter(e.target.value)}
                className="appearance-none bg-card border border-border rounded-xl pl-3 pr-8 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-xs"
              >
                <option value="all">All Groups</option>
                {coordinators.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={perfFilter}
                onChange={(e) => setPerfFilter(e.target.value)}
                className="appearance-none bg-card border border-border rounded-xl pl-3 pr-8 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-xs"
              >
                <option value="all">All Levels</option>
                <option value="high">High (80%+)</option>
                <option value="average">Avg (50-79%)</option>
                <option value="low">Low (&lt;50%)</option>
              </select>
              <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-card/90 backdrop-blur-xs">
                <th className="px-5 py-3.5 font-semibold">Member</th>
                <th className="px-5 py-3.5 font-semibold">Group Leader</th>
                <th className="text-center px-4 py-3.5 font-semibold">Reminders</th>
                <th className="text-right px-5 py-3.5 font-semibold">Weekly Avg</th>
                <th className="text-right px-5 py-3.5 font-semibold">Monthly Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {filteredMembers.map((member) => {
                const overall = overallPct(logs, member.id, month);
                const weekly = getWeeklyPct(member.id);
                const reminders = getReminders(member.id);
                const coordinator = coordinators.find(c => c.id === member.coordinatorId);
                
                return (
                  <tr key={member.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarBadge initials={member.avatar} size="sm" />
                        <div>
                          <span className="font-semibold text-foreground block leading-tight">{member.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{member.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground font-medium">
                      {coordinator ? (
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                          <span>{coordinator.name}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] italic text-muted-foreground/60">Unassigned</span>
                      )}
                    </td>
                    <td className="text-center px-4 py-3.5">
                      {reminders > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                          <Bell className="w-2.5 h-2.5" /> {reminders}
                        </span>
                      ) : (
                        <span className="font-mono text-muted-foreground/30">0</span>
                      )}
                    </td>
                    <td className="text-right px-5 py-3.5 font-mono font-bold">
                      <span className={
                        weekly >= 80 ? "text-emerald-500" : weekly >= 50 ? "text-primary" : "text-destructive"
                      }>
                        {weekly}%
                      </span>
                    </td>
                    <td className="text-right px-5 py-3.5 font-mono font-bold">
                      <span className={
                        overall >= 80 ? "text-emerald-500" : overall >= 50 ? "text-primary" : "text-destructive"
                      }>
                        {overall}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground font-medium">
                    No members match search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Notification History Log Table Card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-secondary/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold">Notification History Log</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Logs of reminder notifications sent to members</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground font-semibold bg-secondary px-2.5 py-1 rounded-lg border border-border/80">
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </span>
          </div>
        </div>

        {/* Notification filters */}
        <div className="p-4 border-b border-border bg-secondary/5 flex flex-col sm:flex-row gap-3 items-center justify-between no-pdf">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={notifSearch}
              onChange={(e) => setNotifSearch(e.target.value)}
              placeholder="Search sender, recipient, message..."
              className="w-full bg-card border border-border rounded-xl pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
            />
            {notifSearch && (
              <button 
                onClick={() => setNotifSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-auto flex justify-end">
            <select
              value={notifStatus}
              onChange={(e) => setNotifStatus(e.target.value)}
              className="appearance-none bg-card border border-border rounded-xl pl-3 pr-8 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-xs"
            >
              <option value="all">All Statuses</option>
              <option value="read">Read Only</option>
              <option value="unread">Unread Only</option>
            </select>
            <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        
        <div className="overflow-x-auto max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-card/90 backdrop-blur-xs">
                <th className="px-5 py-3.5 font-semibold">Date</th>
                <th className="px-5 py-3.5 font-semibold">From</th>
                <th className="px-5 py-3.5 font-semibold">To</th>
                <th className="px-5 py-3.5 font-semibold">Message</th>
                <th className="text-center px-5 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {filteredNotifications.map(n => {
                const from = users.find(u => u.id === n.fromId)?.name || "Unknown";
                const to = users.find(u => u.id === n.toId)?.name || "Unknown";
                const date = new Date(n.sentAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
                
                return (
                  <tr key={n.id} className={n.read ? "hover:bg-secondary/10 transition-colors" : "bg-primary/5 hover:bg-primary/10 transition-colors font-medium text-foreground"}>
                    <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground/80 font-mono">{date}</td>
                    <td className="px-5 py-3.5 font-semibold text-foreground truncate max-w-[120px]" title={from}>{from}</td>
                    <td className="px-5 py-3.5 font-semibold text-foreground truncate max-w-[120px]" title={to}>{to}</td>
                    <td className="px-5 py-3.5 text-muted-foreground/90 max-w-xs truncate" title={n.message}>{n.message}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border
                        ${n.read 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                          : "bg-primary/10 text-primary border-primary/20 animate-pulse"}`}
                      >
                        {n.read ? "Read" : "Unread"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredNotifications.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground font-medium">No notifications found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Print: User Report View ────────────────────────────────────────────────
function PrintUserReportView({ 
  userId, monthId, onBack, allUsers, logs, months 
}: { 
  userId: string; monthId: string; onBack: () => void; allUsers: UserRecord[]; logs: DailyLog[]; months: MonthRecord[] 
}) {
  const subject = allUsers.find(u => u.id === userId) || allUsers[0] || { id: "u_default", name: "No User", email: "", role: "user" as Role, avatar: "NU" };
  const month = months.find(m => m.id === monthId) || getActiveMonth(months);

  const summaryData = PRACTICES.map((p) => ({
    ...p,
    done: completedDays(logs, subject.id, p.id, month),
    progress: pct(completedDays(logs, subject.id, p.id, month), p.target),
  }));

  const overall = Math.round(summaryData.reduce((s, d) => s + d.progress, 0) / summaryData.length);

  const chartData = PRACTICES.map((p) => {
    const done = completedDays(logs, subject.id, p.id, month);
    return { name: getShortPracticeName(p.name), done, target: p.target };
  });
  const streak = useMemo(() => {
    let s = 0;
    for (let d = month.days; d >= 1; d--) {
      const date = dateKey(month, d);
      const hasAny = logs.some((l) => l.userId === subject.id && l.date === date && l.completed);
      if (hasAny) s++; else break;
    }
    return s;
  }, [logs, subject.id, month]);

  const daysLogged = useMemo(() => {
    return new Set(
      logs.filter((l) => l.userId === subject.id && l.date.startsWith(`${month.year}-${String(month.month).padStart(2, "0")}`))
        .map((l) => l.date)
    ).size;
  }, [logs, subject.id, month]);

  const handlePrint = () => {
    const formattedName = subject.name.replace(/\s+/g, '_');
    const formattedMonth = month.label.replace(/\s+/g, '_');
    downloadPDF("user-print-content", `Laporan_Amal_${formattedName}_${formattedMonth}.pdf`);
  };

  return (
    <div className="min-h-screen bg-secondary/20 p-4 md:p-8 flex flex-col items-center">
      {/* Top action bar */}
      <div className="w-full max-w-[800px] mb-6 flex justify-between items-center bg-card border border-border rounded-xl p-4 shadow-sm no-pdf">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Kembali
          </button>
          <span className="text-xs text-muted-foreground font-mono font-medium">Pratinjau Cetak</span>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/95 transition-all shadow-sm cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Cetak PDF
        </button>
      </div>

      {/* The Printable Page itself (White Paper Sheet Style) */}
      <div 
        id="user-print-content" 
        className="w-full max-w-[800px] bg-card border border-border/85 shadow-md p-8 md:p-12 rounded-xl text-foreground"
        style={{ minHeight: "297mm" }} // Standard A4 ratio feel
      >
        {/* Document Header */}
        <div className="border-b border-border pb-6 mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>Laporan Amal Yaumi</h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">Sistem Evaluasi Ibadah & Praktik Spiritual</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-secondary rounded-lg text-xs font-mono font-bold text-primary border border-primary/10">
              {month.label}
            </span>
          </div>
        </div>

        {/* User Info Section */}
        <div className="grid grid-cols-2 gap-4 mb-8 bg-secondary/15 p-4 rounded-xl border border-border/30">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Nama Pengguna</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{subject.name}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{subject.email}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Peran Akun</p>
            <div className="mt-1">
              <RolePill role={subject.role} />
            </div>
          </div>
        </div>

        {/* KPI Performance Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Persentase Amal", value: `${overall}%`, col: overall >= 75 ? "text-emerald-500" : overall >= 50 ? "text-primary" : "text-destructive" },
            { label: "Streak Terpanjang", value: `${streak} hari`, col: "text-primary" },
            { label: "Hari Terisi", value: `${daysLogged} hari`, col: "text-foreground" },
          ].map(({ label, value, col }) => (
            <div key={label} className="border border-border/50 rounded-xl p-4 text-center bg-card">
              <p className="text-xs text-muted-foreground font-medium mb-1.5">{label}</p>
              <p className={`text-xl font-mono font-bold ${col}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Comparison Chart */}
        <div className="bg-card border border-border/50 rounded-xl p-5 mb-8 no-pdf-break">
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold">Grafik Perbandingan Realisasi vs. Target</p>
            <div className="flex gap-4 text-[10px] font-mono text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span>Realisasi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-secondary/80" />
                <span>Target</span>
              </div>
            </div>
          </div>
          <div className="w-full h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={12} barGap={4} margin={{ bottom: 40, left: -20, right: 10, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: "var(--muted-foreground)", fontSize: 8, fontFamily: "sans-serif" }} 
                  angle={-45} 
                  textAnchor="end" 
                  interval={0}
                  height={50}
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 8, fontFamily: "monospace" }} axisLine={false} tickLine={false} width={18} />
                <Bar dataKey="target" fill="var(--secondary)" opacity={0.4} radius={[2,2,0,0]} isAnimationActive={false} name="Target" />
                <Bar dataKey="done" fill="var(--primary)" radius={[2,2,0,0]} isAnimationActive={false} name="Realisasi" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Structured Table for Practice Progress */}
        <div className="border border-border/60 rounded-xl overflow-hidden mb-8">
          <div className="bg-secondary/10 px-4 py-3 border-b border-border/50">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold">Rincian Amal Harian</p>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/50 text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-secondary/5">
                <th className="px-4 py-2.5 font-semibold">Amalan</th>
                <th className="px-4 py-2.5 text-center font-semibold">Realisasi</th>
                <th className="px-4 py-2.5 text-center font-semibold">Target</th>
                <th className="px-4 py-2.5 text-right font-semibold">Progres</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {summaryData.map((d) => (
                <tr key={d.id} className="hover:bg-secondary/5">
                  <td className="px-4 py-3">
                    <span className="mr-2 select-none">{d.icon}</span>
                    <span className="text-foreground font-semibold">{d.name}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono">{d.done} hari</td>
                  <td className="px-4 py-3 text-center font-mono">{d.target} hari</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={d.progress >= 80 ? "text-emerald-500 font-bold" : d.progress >= 50 ? "text-primary font-bold" : "text-destructive font-bold"}>
                      {d.progress}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Signature */}
        <div className="mt-16 pt-8 border-t border-border/40 flex justify-between text-[10px] font-mono text-muted-foreground">
          <p>Dicetak pada: {new Date().toLocaleString()}</p>
          <p className="italic">Amal Yaumi Mutiara © 2026</p>
        </div>
      </div>
    </div>
  );
}

// ── Print: Admin Report View ───────────────────────────────────────────────
function PrintAdminReportView({ 
  monthId, onBack, users, logs, months, notifications 
}: { 
  monthId: string; onBack: () => void; users: UserRecord[]; logs: DailyLog[]; months: MonthRecord[]; notifications: Notification[] 
}) {
  const month = months.find(m => m.id === monthId) || getActiveMonth(months);
  const members = users.filter((u) => u.role === "user");

  // Get last 7 days of the selected month
  const last7Days = Array.from({ length: 7 }, (_, i) => Math.max(1, month.days - i)).map(d => dateKey(month, d));

  const getWeeklyPct = (userId: string) => {
    const done = logs.filter(l => l.userId === userId && last7Days.includes(l.date) && l.completed).length;
    return Math.round((done / (7 * PRACTICES.length)) * 100) || 0;
  };

  const getReminders = (userId: string) => notifications.filter(n => n.toId === userId).length;

  const practiceStats = PRACTICES.map((p) => {
    const avg = members.reduce((s, u) => s + completedDays(logs, u.id, p.id, month), 0) / (members.length || 1);
    return { name: p.name, icon: p.icon, avg: Math.round(avg), target: p.target, progress: pct(Math.round(avg), p.target) };
  });

  const adminChartData = practiceStats.map((p) => ({
    name: getShortPracticeName(p.name),
    avg: p.avg,
    target: p.target
  }));

  const overallCommunityAvg = useMemo(() => {
    if (members.length === 0) return 0;
    const sum = members.reduce((s, u) => s + overallPct(logs, u.id, month), 0);
    return Math.round(sum / members.length);
  }, [members, logs, month]);

  const totalRemindersThisMonth = useMemo(() => {
    return notifications.filter(n => {
      const date = new Date(n.sentAt);
      return date.getFullYear() === month.year && (date.getMonth() + 1) === month.month;
    }).length;
  }, [notifications, month]);

  const handlePrint = () => {
    const formattedMonth = month.label.replace(/\s+/g, '_');
    downloadPDF("admin-print-content", `Laporan_Admin_Lengkap_${formattedMonth}.pdf`);
  };

  return (
    <div className="min-h-screen bg-secondary/20 p-4 md:p-8 flex flex-col items-center">
      {/* Top action bar */}
      <div className="w-full max-w-[850px] mb-6 flex justify-between items-center bg-card border border-border rounded-xl p-4 shadow-sm no-pdf">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Kembali
          </button>
          <span className="text-xs text-muted-foreground font-mono font-medium">Pratinjau Cetak Admin</span>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/95 transition-all shadow-sm cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Cetak PDF Lengkap
        </button>
      </div>

      {/* Printable Sheet */}
      <div 
        id="admin-print-content" 
        className="w-full max-w-[850px] bg-card border border-border/80 shadow-md p-8 md:p-12 rounded-xl text-foreground"
      >
        {/* Document Header */}
        <div className="border-b border-border pb-6 mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>Laporan Evaluasi Bulanan Admin</h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">Statistik Kepatuhan & Aktivitas Komunitas</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-secondary rounded-lg text-xs font-mono font-bold text-primary border border-primary/10">
              {month.label}
            </span>
          </div>
        </div>

        {/* Aggregated KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border border-border/40 rounded-xl p-4 text-center bg-secondary/5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Rata-Rata Komunitas</p>
            <p className="text-2xl font-mono font-bold text-primary">{overallCommunityAvg}%</p>
          </div>
          <div className="border border-border/40 rounded-xl p-4 text-center bg-secondary/5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Anggota Aktif</p>
            <p className="text-2xl font-mono font-bold text-foreground">{members.length}</p>
          </div>
          <div className="border border-border/40 rounded-xl p-4 text-center bg-secondary/5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Pengingat Terkirim</p>
            <p className="text-2xl font-mono font-bold text-foreground">{totalRemindersThisMonth}</p>
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="bg-card border border-border/50 rounded-xl p-5 mb-8 no-pdf-break">
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold">Grafik Rata-Rata Capaian Komunitas vs. Target</p>
            <div className="flex gap-4 text-[10px] font-mono text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span>Rata-Rata</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-secondary/80" />
                <span>Target</span>
              </div>
            </div>
          </div>
          <div className="w-full h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={adminChartData} barSize={12} barGap={4} margin={{ bottom: 40, left: -20, right: 10, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: "var(--muted-foreground)", fontSize: 8, fontFamily: "sans-serif" }} 
                  angle={-45} 
                  textAnchor="end" 
                  interval={0}
                  height={50}
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 8, fontFamily: "monospace" }} axisLine={false} tickLine={false} width={18} />
                <Bar dataKey="target" fill="var(--secondary)" opacity={0.4} radius={[2,2,0,0]} isAnimationActive={false} name="Target" />
                <Bar dataKey="avg" fill="var(--primary)" radius={[2,2,0,0]} isAnimationActive={false} name="Rata-Rata" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table 1: Practice Averages */}
        <div className="border border-border/60 rounded-xl overflow-hidden mb-8">
          <div className="bg-secondary/10 px-4 py-3 border-b border-border/50">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold">Rata-Rata Capaian Per Amalan</p>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/50 text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-secondary/5">
                <th className="px-4 py-2.5 font-semibold">Amalan</th>
                <th className="px-4 py-2.5 text-center font-semibold">Hari Rata-Rata</th>
                <th className="px-4 py-2.5 text-center font-semibold">Target</th>
                <th className="px-4 py-2.5 text-right font-semibold">Progres</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {practiceStats.map((p) => (
                <tr key={p.name}>
                  <td className="px-4 py-2.5">
                    <span className="mr-2">{p.icon}</span>
                    <span className="text-foreground font-semibold">{p.name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono">{p.avg} hari</td>
                  <td className="px-4 py-2.5 text-center font-mono">{p.target} hari</td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    <span className={p.progress >= 80 ? "text-emerald-500" : p.progress >= 50 ? "text-primary" : "text-destructive"}>
                      {p.progress}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table 2: Individual Member Records */}
        <div className="border border-border/60 rounded-xl overflow-hidden mb-8">
          <div className="bg-secondary/10 px-4 py-3 border-b border-border/50">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold">Catatan Kepatuhan Per Anggota</p>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/50 text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-secondary/5">
                <th className="px-4 py-2.5 font-semibold">Anggota</th>
                <th className="px-4 py-2.5 text-center font-semibold">Pengingat</th>
                <th className="px-4 py-2.5 text-right font-semibold">Rerata Mingguan</th>
                <th className="px-4 py-2.5 text-right font-semibold">Rerata Bulanan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {members.map((member) => {
                const overall = overallPct(logs, member.id, month);
                const weekly = getWeeklyPct(member.id);
                const reminders = getReminders(member.id);
                return (
                  <tr key={member.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{member.email}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-muted-foreground">{reminders}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground">{weekly}%</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span className={overall >= 80 ? "text-emerald-500" : overall >= 50 ? "text-primary" : "text-destructive"}>
                        {overall}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table 3: Notification History Log */}
        <div className="border border-border/60 rounded-xl overflow-hidden">
          <div className="bg-secondary/10 px-4 py-3 border-b border-border/50">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold">Log Histori Pengingat Terkirim</p>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/50 text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-secondary/5">
                <th className="px-4 py-2.5 font-semibold">Waktu</th>
                <th className="px-4 py-2.5 font-semibold">Pengirim</th>
                <th className="px-4 py-2.5 font-semibold">Penerima</th>
                <th className="px-4 py-2.5 font-semibold">Pesan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-[11px] text-muted-foreground">
              {notifications.slice().reverse().map((n) => {
                const from = users.find(u => u.id === n.fromId)?.name || "Unknown";
                const to = users.find(u => u.id === n.toId)?.name || "Unknown";
                const date = new Date(n.sentAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
                return (
                  <tr key={n.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap font-mono">{date}</td>
                    <td className="px-4 py-2.5 font-semibold text-foreground">{from}</td>
                    <td className="px-4 py-2.5 font-semibold text-foreground">{to}</td>
                    <td className="px-4 py-2.5 truncate max-w-xs">{n.message}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Signature */}
        <div className="mt-16 pt-8 border-t border-border/40 flex justify-between text-[10px] font-mono text-muted-foreground">
          <p>Dicetak pada: {new Date().toLocaleString()}</p>
          <p className="italic">Amal Yaumi Mutiara © 2026</p>
        </div>
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return localStorage.getItem("amal_tracker_current_user_id");
  });
  const [view, setView] = useState(() => {
    return localStorage.getItem("amal_tracker_current_view") || "home";
  });
  const [logs, setLogsState] = useState<DailyLog[]>([]);
  const [users, setUsersState] = useState<UserRecord[]>([]);
  const [months, setMonthsState] = useState<MonthRecord[]>([]);
  const [notifications, setNotificationsState] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [printUserId, setPrintUserId] = useState<string | null>(null);
  const [printMonthId, setPrintMonthId] = useState<string | null>(null);
  const [printFromView, setPrintFromView] = useState<string>("home");

  // Load data from Supabase on mount
  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [u, l, m, n] = await Promise.all([
          fetchUsers(),
          fetchLogs(),
          fetchMonths(),
          fetchNotifications(),
        ]);
        if (active) {
          setUsersState(u);
          setLogsState(l);
          setMonthsState(m);
          setNotificationsState(n);
        }
      } catch (error) {
        console.error("Error loading data from Supabase:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const currentUser = useMemo(() => users.find((u) => u.id === currentUserId) || null, [users, currentUserId]);

  const setLogs = async (newLogs: DailyLog[]) => {
    // Determine the difference between logs and newLogs
    const added = newLogs.find(
      (n) => !logs.some((o) => o.userId === n.userId && o.practiceId === n.practiceId && o.date === n.date)
    );
    const removed = logs.find(
      (o) => !newLogs.some((n) => o.userId === n.userId && o.practiceId === n.practiceId && o.date === n.date)
    );

    // Optimistically update frontend state
    setLogsState(newLogs);

    if (added) {
      await insertLog(added);
    } else if (removed) {
      await deleteLog(removed.userId, removed.date, removed.practiceId);
    }
  };

  const setUsers = async (newUsers: UserRecord[]) => {
    const added = newUsers.find((n) => !users.some((o) => o.id === n.id));
    const updated = newUsers.find((n) => {
      const o = users.find((x) => x.id === n.id);
      return o && (o.role !== n.role || o.coordinatorId !== n.coordinatorId);
    });

    setUsersState(newUsers);

    if (added) {
      await insertUser(added);
    } else if (updated) {
      await updateUserRole(updated.id, updated.role);
    }
  };

  const setMonths = async (newMonths: MonthRecord[]) => {
    const added = newMonths.find((n) => !months.some((o) => o.id === n.id));
    const activated = newMonths.find((n) => n.active && !months.find((o) => o.id === n.id)?.active);

    setMonthsState(newMonths);

    if (added) {
      await insertMonth(added);
    }
    if (activated) {
      await setActiveMonth(activated.id);
    }
  };

  const setNotifications = async (newNotifications: Notification[]) => {
    const added = newNotifications.find((n) => !notifications.some((o) => o.id === n.id));
    const readUpdated = newNotifications.find((n) => n.read && !notifications.find((o) => o.id === n.id)?.read);

    setNotificationsState(newNotifications);

    if (added) {
      await insertNotification(added);
    } else if (readUpdated) {
      await markNotificationRead(readUpdated.id);
    }
  };

  const handleLogin = (u: UserRecord) => {
    setCurrentUserId(u.id);
    localStorage.setItem("amal_tracker_current_user_id", u.id);
    const initialView = u.role === "admin" ? "admin-users" : "home";
    setView(initialView);
    localStorage.setItem("amal_tracker_current_view", initialView);
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    localStorage.removeItem("amal_tracker_current_user_id");
    setView("home");
    localStorage.removeItem("amal_tracker_current_view");
  };

  const handleSetView = (v: string) => {
    setView(v);
    localStorage.setItem("amal_tracker_current_view", v);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card border border-primary/20 mb-4 shadow-sm animate-pulse">
            <Moon className="w-8 h-8 text-primary animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <h2 className="text-lg font-light text-foreground mb-1" style={{ fontFamily: "'Crimson Pro', serif" }}>Memuat Data...</h2>
          <p className="text-xs text-muted-foreground font-mono">Menghubungkan ke Supabase</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} users={users} />;
  }

  const unread = notifications.filter((n) => n.toId === currentUser.id && !n.read).length;

  const handleNavigateToPrint = (userId: string | null, monthId: string, fromView: string) => {
    setPrintUserId(userId);
    setPrintMonthId(monthId);
    setPrintFromView(fromView);
    handleSetView(userId ? "print-user-report" : "print-admin-report");
  };

  const renderView = () => {
    switch (view) {
      case "home":          return <DailyLogView currentUser={currentUser} logs={logs} setLogs={setLogs} months={months} />;
      case "progress":      return <ProgressView currentUser={currentUser} logs={logs} months={months} />;
      case "analytics":     return <AnalyticsView currentUser={currentUser} logs={logs} allUsers={users} months={months} onNavigateToPrint={handleNavigateToPrint} />;
      case "peers":         return <PeersView currentUser={currentUser} logs={logs} allUsers={users} months={months} notifications={notifications} setNotifications={setNotifications} />;
      case "notifications": return <NotificationsView currentUser={currentUser} notifications={notifications} setNotifications={setNotifications} allUsers={users} />;
      case "group":         return <GroupView currentUser={currentUser} logs={logs} notifications={notifications} setNotifications={setNotifications} allUsers={users} months={months} />;
      case "admin-users":   return <AdminUsers users={users} setUsers={setUsers} />;
      case "admin-months":  return <AdminMonths months={months} setMonths={setMonths} />;
      case "admin-reports": return <AdminReports users={users} logs={logs} months={months} notifications={notifications} onNavigateToPrint={handleNavigateToPrint} />;
      case "print-user-report":
        return <PrintUserReportView 
          userId={printUserId!} 
          monthId={printMonthId!} 
          onBack={() => handleSetView(printFromView)} 
          allUsers={users}
          logs={logs}
          months={months}
        />;
      case "print-admin-report":
        return <PrintAdminReportView 
          monthId={printMonthId!} 
          onBack={() => handleSetView(printFromView)} 
          users={users}
          logs={logs}
          months={months}
          notifications={notifications}
        />;
      default:              return <DailyLogView currentUser={currentUser} logs={logs} setLogs={setLogs} months={months} />;
    }
  };

  const isPrintView = view === "print-user-report" || view === "print-admin-report";

  return (
    <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {!isPrintView && (
        <Sidebar currentUser={currentUser} active={view} setView={handleSetView} onLogout={handleLogout} unread={unread} months={months} />
      )}
      <main className="flex-1 overflow-y-auto">{renderView()}</main>
    </div>
  );
}

