import { useState, useMemo } from "react";
import {
  BookOpen, Moon, Users, Bell, LogOut, Check, X, Plus, Send,
  BarChart2, Calendar, Shield, User, ChevronDown, ChevronLeft,
  ChevronRight, AlertCircle, CheckCircle, Clock, TrendingUp, Search
} from "lucide-react";
import {
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, LineChart, Line,
} from "recharts";
import {
  loadUsers, saveUsers, loadLogs, saveLogs, loadMonths, saveMonths,
  loadNotifications, saveNotifications, PRACTICES, UserRecord, Role,
  DailyLog, MonthRecord, Notification
} from "./db";

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
  onRegister,
  users,
}: {
  onLogin: (u: UserRecord) => void;
  onRegister: (name: string, email: string, role: Role, coordinatorId?: string) => UserRecord;
  users: UserRecord[];
}) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Sign up form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regRole, setRegRole] = useState<Role>("user");
  const [regCoordId, setRegCoordId] = useState("");

  const coordinators = useMemo(() => {
    return users.filter((u) => u.role === "coordinator" || u.role === "admin");
  }, [users]);

  // Set default selected coordinator if registering as a member
  useMemo(() => {
    if (coordinators.length > 0 && !regCoordId) {
      setRegCoordId(coordinators[0].id);
    }
  }, [coordinators, regCoordId]);

  // Filtered users for search in Sign In
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleSignIn = () => {
    const u = users.find((x) => x.id === selectedUserId);
    if (u) {
      onLogin(u);
    }
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;
    const newUser = onRegister(
      regName.trim(),
      regEmail.trim(),
      regRole,
      regRole === "user" ? regCoordId : undefined
    );
    // Auto login
    onLogin(newUser);
  };

  const demoAccounts = [
    { id: "u3", desc: "Member — Ibrahim Hassan" },
    { id: "u2", desc: "Coordinator — Fatimah Noor" },
    { id: "u1", desc: "Administrator — Ahmad Yusuf" },
  ];

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

        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden transition-all duration-300">
          {/* Tabs */}
          <div className="flex border-b border-border bg-secondary/20">
            <button
              onClick={() => setActiveTab("signin")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === "signin"
                  ? "border-primary text-primary bg-card"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab("signup")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === "signup"
                  ? "border-primary text-primary bg-card"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="p-6">
            {activeTab === "signin" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                    Search or Select User
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Search className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <input
                      type="text"
                      placeholder="Type email or name..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      className="w-full bg-secondary border border-border rounded px-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {showUserDropdown && (
                    <div className="absolute z-10 mt-1 w-[calc(100%-3rem)] max-h-56 bg-card border border-border rounded shadow-xl overflow-y-auto divide-y divide-border/50">
                      {filteredUsers.length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground text-center">
                          No users found
                        </div>
                      ) : (
                        filteredUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedUserId(u.id);
                              setSearch(u.name);
                              setShowUserDropdown(false);
                            }}
                            className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-secondary/40 transition-colors"
                          >
                            <AvatarBadge initials={u.avatar} size="sm" role={u.role} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-foreground truncate">{u.name}</span>
                                <RolePill role={u.role} />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground block truncate">{u.email}</span>
                            </div>
                            {selectedUserId === u.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedUserId && (
                  <div className="bg-secondary/20 border border-border/40 rounded p-3 flex items-center gap-3 animate-fadeIn">
                    {(() => {
                      const u = users.find((x) => x.id === selectedUserId);
                      if (!u) return null;
                      return (
                        <>
                          <AvatarBadge initials={u.avatar} role={u.role} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate">{u.email}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <button
                  onClick={handleSignIn}
                  disabled={!selectedUserId}
                  className="w-full py-2.5 rounded bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                >
                  Sign In
                </button>

                <div className="pt-4 border-t border-border/60">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
                    Quick Demo Accounts
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {demoAccounts.map(({ id, desc }) => {
                      const u = users.find((x) => x.id === id);
                      if (!u) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(u.id);
                            setSearch(u.name);
                            setShowUserDropdown(false);
                          }}
                          className={`flex items-center justify-between p-2 rounded text-xs text-left border transition-all ${
                            selectedUserId === id
                              ? "bg-primary/10 border-primary/40 text-primary"
                              : "bg-secondary/10 border-border/40 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                          }`}
                        >
                          <span>{desc}</span>
                          <RolePill role={u.role} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ibrahim Hassan"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ibrahim@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                    Role
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as Role)}
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  >
                    <option value="user">Member</option>
                    <option value="coordinator">Coordinator</option>
                  </select>
                </div>

                {regRole === "user" && coordinators.length > 0 && (
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                      Select Coordinator
                    </label>
                    <select
                      value={regCoordId}
                      onChange={(e) => setRegCoordId(e.target.value)}
                      className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    >
                      {coordinators.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.role === "admin" ? "Admin" : "Coordinator"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 mt-2 rounded bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-all shadow-sm active:scale-[0.99]"
                >
                  Create Account & Login
                </button>
              </form>
            )}
          </div>
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
  const coordLinks = [...userLinks, { id: "group", label: "My Group", icon: Shield }];
  const adminLinks = [
    { id: "admin-users",   label: "Users",   icon: User },
    { id: "admin-months",  label: "Months",  icon: Calendar },
    { id: "admin-reports", label: "Reports", icon: BarChart2 },
  ];
  const links = currentUser.role === "admin" ? adminLinks : currentUser.role === "coordinator" ? coordLinks : userLinks;
  const am = months.find((m) => m.active)!;

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
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">{month.label}</p>
      <div className="grid grid-cols-7 gap-1">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-mono text-muted-foreground py-1">{d}</div>
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
              className={`relative aspect-square rounded text-xs font-mono transition-all flex items-center justify-center
                ${isFuture ? "text-muted-foreground/20 cursor-not-allowed" : ""}
                ${isSel ? "bg-primary text-primary-foreground font-medium" : ""}
                ${!isSel && !isFuture ? "hover:bg-secondary text-foreground" : ""}
              `}
            >
              {day}
              {hasMark && !isSel && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60" />
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
  const activeMonth = months.find((m) => m.active)!;
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
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">{activeMonth.label}</p>
        <h1 className="text-3xl font-light text-foreground mb-1" style={{ fontFamily: "'Crimson Pro', serif" }}>Daily Record</h1>
        <p className="text-sm text-muted-foreground">
          {isToday ? "Today — " : ""}
          {new Date(activeMonth.year, activeMonth.month - 1, selectedDay).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-6">
        {/* Calendar picker */}
        <div className="w-56">
          <DayPicker month={activeMonth} selectedDay={selectedDay} onChange={setSelectedDay} markedDays={markedDays} />
          <div className="mt-3 bg-card border border-border rounded p-3 text-center">
            <p className="text-2xl font-mono font-medium text-primary">{markedDays.size}</p>
            <p className="text-xs text-muted-foreground">days logged this month</p>
          </div>
        </div>

        {/* Practice checklist */}
        <div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Done today", value: `${totalDone} / ${PRACTICES.length}`, icon: CheckCircle, col: "text-emerald-400" },
              { label: "Day of month", value: `${selectedDay} / ${activeMonth.days}`, icon: Calendar, col: "text-primary" },
              { label: "Days left", value: `${activeMonth.days - today}`, icon: Clock, col: "text-muted-foreground" },
            ].map(({ label, value, icon: Icon, col }) => (
              <div key={label} className="bg-card border border-border rounded p-3">
                <Icon className={`w-3.5 h-3.5 ${col} mb-1.5`} />
                <p className="text-base font-mono font-medium text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Practices</p>
              {!isToday && (
                <span className="text-[10px] font-mono text-primary border border-primary/20 px-2 py-0.5 rounded">
                  Editing day {selectedDay}
                </span>
              )}
            </div>
            <div className="divide-y divide-border">
              {PRACTICES.map((p) => {
                const done = isDone(p.id);
                const monthDays = completedDays(logs, currentUser.id, p.id, activeMonth);
                const progress = pct(monthDays, p.target);
                return (
                  <div key={p.id} className={`px-4 py-3.5 flex items-center gap-3.5 transition-colors ${done ? "bg-emerald-950/10" : ""}`}>
                    <button
                      onClick={() => toggle(p.id)}
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all
                        ${done ? "bg-emerald-500/20 border-emerald-500/50" : "border-border hover:border-primary/40"}`}>
                      {done && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>
                    <span className="text-base">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>{p.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <ProgressBar value={progress} size="sm" />
                        <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{monthDays}/{p.target}</span>
                      </div>
                    </div>
                    {done && <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">✓</span>}
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
  const activeMonth = months.find((m) => m.active)!;
  const chartData = PRACTICES.map((p) => {
    const done = completedDays(logs, currentUser.id, p.id, activeMonth);
    return { name: p.name.split(" ")[0], done, target: p.target, pct: pct(done, p.target), icon: p.icon };
  });
  const overall = Math.round(chartData.reduce((s, d) => s + d.pct, 0) / chartData.length);
  const met = chartData.filter((d) => d.pct >= 100).length;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">{activeMonth.label}</p>
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>My Progress</h1>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Overall completion", value: `${overall}%` },
          { label: "Targets met", value: `${met} / ${PRACTICES.length}` },
          { label: "Days logged", value: `${new Set(logsForMonth(logs, currentUser.id, activeMonth).map((l) => l.date)).size}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded p-4">
            <p className="text-2xl font-mono font-medium text-primary">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-lg p-5 mb-4">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">Days completed vs. target</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={18} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,108,0.07)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#7a8299", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#7a8299", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={22} />
            <Tooltip contentStyle={{ background: "#131929", border: "1px solid rgba(201,168,108,0.15)", borderRadius: 4, fontSize: 11, fontFamily: "JetBrains Mono", color: "#e8e2d5" }} cursor={{ fill: "rgba(201,168,108,0.04)" }} />
            <Bar dataKey="target" fill="rgba(201,168,108,0.12)" radius={[2,2,0,0]} name="Target" />
            <Bar dataKey="done"   fill="#c9a86c"              radius={[2,2,0,0]} name="Done" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Practice breakdown</p>
        </div>
        {chartData.map((d) => (
          <div key={d.name} className="px-5 py-3.5 border-b border-border last:border-0 flex items-center gap-4">
            <span className="text-lg">{PRACTICES.find((p) => p.name.startsWith(d.name))?.icon}</span>
            <div className="flex-1">
              <div className="flex justify-between mb-1.5">
                <p className="text-sm text-foreground">{PRACTICES.find((p) => p.name.startsWith(d.name))?.name}</p>
                <span className="text-xs font-mono text-muted-foreground">{d.done} / {d.target}</span>
              </div>
              <ProgressBar value={d.pct} />
            </div>
            <span className={`text-xs font-mono font-medium w-9 text-right ${d.pct >= 80 ? "text-emerald-400" : d.pct >= 50 ? "text-primary" : "text-red-400"}`}>{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Analytics View ─────────────────────────────────────────────────────────
function AnalyticsView({ currentUser, logs, allUsers, months }: {
  currentUser: UserRecord; logs: DailyLog[]; allUsers: UserRecord[]; months: MonthRecord[];
}) {
  const canViewOthers = currentUser.role === "coordinator" || currentUser.role === "admin";

  // Accessible users for "view as"
  const viewableUsers = canViewOthers
    ? currentUser.role === "admin"
      ? allUsers.filter((u) => u.role === "user" || u.role === "coordinator")
      : allUsers.filter((u) => u.coordinatorId === currentUser.id)
    : [];

  const [viewUserId, setViewUserId] = useState(currentUser.id);
  const activeMonth = months.find((m) => m.active)!;
  const [selectedMonthId, setSelectedMonthId] = useState(activeMonth.id);

  const subject = allUsers.find((u) => u.id === viewUserId) ?? currentUser;
  const month = months.find((m) => m.id === selectedMonthId)!;

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
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Header + controls */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Analytics</p>
          <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
            {subject.id === currentUser.id ? "My Analytics" : `${subject.name.split(" ")[0]}'s Analytics`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Month picker */}
          <div className="relative">
            <select
              value={selectedMonthId}
              onChange={(e) => setSelectedMonthId(e.target.value)}
              className="appearance-none bg-card border border-border rounded px-3 py-1.5 text-xs font-mono text-foreground pr-7 focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* User picker (coord/admin only) */}
          {canViewOthers && (
            <div className="relative">
              <select
                value={viewUserId}
                onChange={(e) => setViewUserId(e.target.value)}
                className="appearance-none bg-card border border-border rounded px-3 py-1.5 text-xs font-mono text-foreground pr-7 focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
              >
                <option value={currentUser.id}>Myself</option>
                {viewableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Viewing other user banner */}
      {subject.id !== currentUser.id && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded p-3 mb-6">
          <AvatarBadge initials={subject.avatar} size="sm" role={subject.role} />
          <p className="text-xs text-muted-foreground">
            Viewing <span className="text-foreground font-medium">{subject.name}</span> — {month.label}
          </p>
          <button onClick={() => setViewUserId(currentUser.id)} className="ml-auto text-xs text-muted-foreground hover:text-primary transition-colors font-mono">
            Back to mine
          </button>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Overall", value: `${overall}%`, col: overall >= 70 ? "text-emerald-400" : overall >= 40 ? "text-primary" : "text-red-400" },
          { label: "Current streak", value: `${streak}d`, col: "text-primary" },
          { label: "Days logged", value: `${new Set(logs.filter((l) => l.userId === subject.id && l.date.startsWith(`${month.year}-${String(month.month).padStart(2,"0")}`)).map((l) => l.date)).size}`, col: "text-foreground" },
          { label: "Targets met", value: `${summaryData.filter((d) => d.progress >= 100).length} / ${PRACTICES.length}`, col: "text-foreground" },
        ].map(({ label, value, col }) => (
          <div key={label} className="bg-card border border-border rounded p-4">
            <p className={`text-2xl font-mono font-medium ${col}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Daily trend chart */}
      <div className="bg-card border border-border rounded-lg p-5 mb-4">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">Daily practice count — {month.label}</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,108,0.07)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: "#7a8299", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} interval={4} />
            <YAxis domain={[0, PRACTICES.length]} tick={{ fill: "#7a8299", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={20} />
            <Tooltip contentStyle={{ background: "#131929", border: "1px solid rgba(201,168,108,0.15)", borderRadius: 4, fontSize: 11, fontFamily: "JetBrains Mono", color: "#e8e2d5" }} cursor={{ stroke: "rgba(201,168,108,0.15)" }} />
            <Line type="monotone" dataKey="completed" stroke="#c9a86c" strokeWidth={1.5} dot={false} name="Practices done" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap: practices × days */}
      <div className="bg-card border border-border rounded-lg overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Practice heatmap — each cell = one day</p>
        </div>
        <div className="p-4 overflow-x-auto">
          <div className="min-w-max">
            {/* Day numbers header */}
            <div className="flex gap-px mb-1 pl-28">
              {heatmapData.map((r) => (
                <div key={r.day} className="w-5 text-center text-[8px] font-mono text-muted-foreground/50">{r.day % 5 === 0 ? r.day : ""}</div>
              ))}
            </div>
            {PRACTICES.map((p) => (
              <div key={p.id} className="flex items-center gap-2 mb-1">
                <span className="text-sm w-5 text-center shrink-0">{p.icon}</span>
                <span className="text-[10px] font-mono text-muted-foreground w-[88px] truncate shrink-0">{p.name.split(" ")[0]}</span>
                <div className="flex gap-px">
                  {heatmapData.map((r) => {
                    const done = r[p.id] as boolean;
                    return (
                      <div
                        key={r.day}
                        title={`Day ${r.day}: ${done ? "Done" : "Not done"}`}
                        className={`w-5 h-5 rounded-[2px] transition-colors ${done ? "bg-primary/70" : "bg-secondary/60"}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-practice summary */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Monthly targets</p>
        </div>
        {summaryData.map((d) => (
          <div key={d.id} className="px-5 py-3.5 border-b border-border last:border-0 flex items-center gap-4">
            <span className="text-lg">{d.icon}</span>
            <div className="flex-1">
              <div className="flex justify-between mb-1.5">
                <p className="text-sm text-foreground">{d.name}</p>
                <span className="text-xs font-mono text-muted-foreground">{d.done} / {d.target} days</span>
              </div>
              <ProgressBar value={d.progress} />
            </div>
            <span className={`text-xs font-mono font-medium w-9 text-right ${d.progress >= 80 ? "text-emerald-400" : d.progress >= 50 ? "text-primary" : "text-red-400"}`}>
              {d.progress}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Peers View ─────────────────────────────────────────────────────────────
function PeersView({ currentUser, logs, allUsers, months }: { currentUser: UserRecord; logs: DailyLog[]; allUsers: UserRecord[]; months: MonthRecord[] }) {
  const activeMonth = months.find((m) => m.active)!;
  const peers = allUsers.filter((u) => u.role === "user" && u.id !== currentUser.id);
  const sorted = [...peers].sort((a, b) => overallPct(logs, b.id, activeMonth) - overallPct(logs, a.id, activeMonth));

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Community</p>
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>Fellow Practitioners</h1>
        <p className="text-sm text-muted-foreground mt-1">Mutual visibility for motivation — may Allah bless their efforts.</p>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex justify-between">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Members — {activeMonth.label}</p>
          <span className="text-xs font-mono text-muted-foreground">{sorted.length} members</span>
        </div>
        {sorted.map((peer, idx) => {
          const overall = overallPct(logs, peer.id, activeMonth);
          return (
            <div key={peer.id} className="px-5 py-4 border-b border-border last:border-0 flex items-center gap-4">
              <span className="text-xs font-mono text-muted-foreground w-5">{idx + 1}</span>
              <AvatarBadge initials={peer.avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{peer.name}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <ProgressBar value={overall} size="sm" />
                  <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{overall}%</span>
                </div>
              </div>
              <div className="flex gap-1">
                {PRACTICES.map((p) => {
                  const todayDate = dateKey(activeMonth, Math.min(new Date().getDate(), activeMonth.days));
                  const done = logs.some((l) => l.userId === peer.id && l.date === todayDate && l.practiceId === p.id);
                  return <span key={p.id} title={p.name} className={`text-sm ${done ? "opacity-100" : "opacity-20"}`}>{p.icon}</span>;
                })}
              </div>
            </div>
          );
        })}
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
  const activeMonth = months.find((m) => m.active)!;
  const members = allUsers.filter((u) => u.coordinatorId === currentUser.id);
  const [sendTo, setSendTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const sendNotification = () => {
    if (!sendTo || !message.trim()) return;
    setNotifications([...notifications, { id: `n${Date.now()}`, fromId: currentUser.id, toId: sendTo, message: message.trim(), sentAt: new Date().toISOString(), read: false }]);
    setMessage(""); setSendTo(null);
  };

  const atRisk = members.filter((u) => overallPct(logs, u.id, activeMonth) < 60);

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Coordinator</p>
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>My Group</h1>
        <p className="text-sm text-muted-foreground mt-1">{members.length} members under your care</p>
      </div>
      {atRisk.length > 0 && (
        <div className="bg-red-900/10 border border-red-700/20 rounded p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-300">Attention needed</p>
            <p className="text-xs text-red-400/80 mt-0.5">{atRisk.map((u) => u.name.split(" ")[0]).join(", ")} {atRisk.length === 1 ? "is" : "are"} below 60% completion.</p>
          </div>
        </div>
      )}
      <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Member overview — {activeMonth.label}</p>
        </div>
        {members.map((member) => {
          const overall = overallPct(logs, member.id, activeMonth);
          return (
            <div key={member.id} className="px-5 py-4 border-b border-border last:border-0">
              <div className="flex items-center gap-3 mb-3">
                <AvatarBadge initials={member.avatar} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    {overall < 60 && <AlertCircle className="w-3 h-3 text-red-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{overall}% overall</p>
                </div>
                <button onClick={() => setSendTo(member.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded hover:border-primary/30 hover:text-primary transition-all">
                  <Send className="w-3 h-3" /> Remind
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {PRACTICES.map((p) => {
                  const done = completedDays(logs, member.id, p.id, activeMonth);
                  const progress = pct(done, p.target);
                  return (
                    <div key={p.id} className="text-center">
                      <p className="text-base mb-0.5">{p.icon}</p>
                      <ProgressBar value={progress} size="sm" />
                      <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{done}/{p.target}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {sendTo && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-card border border-border rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Reminder to</p>
                <p className="text-sm font-medium text-foreground">{allUsers.find((u) => u.id === sendTo)?.name}</p>
              </div>
              <button onClick={() => { setSendTo(null); setMessage(""); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message…" rows={4}
              className="w-full bg-secondary border border-border rounded p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/40 transition-colors" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setSendTo(null); setMessage(""); }} className="flex-1 py-2 text-sm text-muted-foreground border border-border rounded hover:bg-secondary/50 transition-colors">Cancel</button>
              <button onClick={sendNotification} disabled={!message.trim()} className="flex-1 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-40">Send</button>
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
  const [form, setForm] = useState({ label: "", year: 2025, month: 4, days: 30 });
  const addMonth = () => {
    if (!form.label) return;
    setMonths([...months, { id: `m${Date.now()}`, ...form, active: false }]);
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
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Rajab 1446"
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors" />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })} placeholder="Year"
                  className="bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors" />
                <input type="number" min={1} max={12} value={form.month} onChange={(e) => setForm({ ...form, month: +e.target.value })} placeholder="Month"
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
function AdminReports({ users, logs, months }: { users: UserRecord[]; logs: DailyLog[]; months: MonthRecord[] }) {
  const [selectedMonthId, setSelectedMonthId] = useState(months.find((m) => m.active)!.id);
  const month = months.find((m) => m.id === selectedMonthId)!;
  const members = users.filter((u) => u.role === "user");
  const coordinators = users.filter((u) => u.role === "coordinator");

  const practiceStats = PRACTICES.map((p) => {
    const avg = members.reduce((s, u) => s + completedDays(logs, u.id, p.id, month), 0) / (members.length || 1);
    return { name: p.name.split(" ")[0], icon: p.icon, avg: Math.round(avg), target: p.target, progress: pct(Math.round(avg), p.target) };
  });

  const byCoord = coordinators.map((c) => {
    const group = members.filter((u) => u.coordinatorId === c.id);
    const avg = group.length > 0 ? Math.round(group.reduce((s, u) => s + overallPct(logs, u.id, month), 0) / group.length) : 0;
    return { coordinator: c, groupSize: group.length, avg };
  });

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Administration</p>
          <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>Monthly Report</h1>
        </div>
        <div className="relative">
          <select value={selectedMonthId} onChange={(e) => setSelectedMonthId(e.target.value)}
            className="appearance-none bg-card border border-border rounded px-3 py-1.5 text-xs font-mono text-foreground pr-7 focus:outline-none focus:border-primary/40 transition-colors cursor-pointer">
            {months.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">Community practice averages</p>
          <div className="space-y-3">
            {practiceStats.map((p) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-sm">{p.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-foreground">{p.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{p.avg}/{p.target}</span>
                  </div>
                  <ProgressBar value={p.progress} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">By coordinator group</p>
          <div className="space-y-4">
            {byCoord.map(({ coordinator, groupSize, avg }) => (
              <div key={coordinator.id}>
                <div className="flex items-center gap-2 mb-2">
                  <AvatarBadge initials={coordinator.avatar} size="sm" role="coordinator" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{coordinator.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{groupSize} members · {avg}% avg</p>
                  </div>
                </div>
                <ProgressBar value={avg} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex justify-between">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Individual records</p>
          <span className="text-xs font-mono text-muted-foreground">{members.length} members</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-2.5 text-muted-foreground font-normal">Member</th>
                {PRACTICES.map((p) => <th key={p.id} className="text-center px-3 py-2.5 text-muted-foreground font-normal">{p.icon}</th>)}
                <th className="text-right px-5 py-2.5 text-muted-foreground font-normal">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => {
                const overall = overallPct(logs, member.id, month);
                return (
                  <tr key={member.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <AvatarBadge initials={member.avatar} size="sm" />
                        <span className="text-foreground">{member.name}</span>
                      </div>
                    </td>
                    {PRACTICES.map((p) => {
                      const done = completedDays(logs, member.id, p.id, month);
                      const progress = pct(done, p.target);
                      return (
                        <td key={p.id} className="text-center px-3 py-3">
                          <span className={progress >= 80 ? "text-emerald-400" : progress >= 50 ? "text-primary" : "text-red-400"}>{done}/{p.target}</span>
                        </td>
                      );
                    })}
                    <td className="text-right px-5 py-3">
                      <span className={`font-medium ${overall >= 80 ? "text-emerald-400" : overall >= 50 ? "text-primary" : "text-red-400"}`}>{overall}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
  const [logs, setLogsState] = useState<DailyLog[]>(() => loadLogs());
  const [users, setUsersState] = useState<UserRecord[]>(() => loadUsers());
  const [months, setMonthsState] = useState<MonthRecord[]>(() => loadMonths());
  const [notifications, setNotificationsState] = useState<Notification[]>(() => loadNotifications());

  const currentUser = useMemo(() => users.find((u) => u.id === currentUserId) || null, [users, currentUserId]);

  const setLogs = (newLogs: DailyLog[]) => {
    setLogsState(newLogs);
    saveLogs(newLogs);
  };
  const setUsers = (newUsers: UserRecord[]) => {
    setUsersState(newUsers);
    saveUsers(newUsers);
  };
  const setMonths = (newMonths: MonthRecord[]) => {
    setMonthsState(newMonths);
    saveMonths(newMonths);
  };
  const setNotifications = (newNotifications: Notification[]) => {
    setNotificationsState(newNotifications);
    saveNotifications(newNotifications);
  };

  const handleRegister = (name: string, email: string, role: Role, coordinatorId?: string): UserRecord => {
    const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const newUser: UserRecord = {
      id: `u${Date.now()}`,
      name,
      email,
      role,
      coordinatorId,
      avatar: initials,
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    return newUser;
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

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} users={users} />;
  }

  const unread = notifications.filter((n) => n.toId === currentUser.id && !n.read).length;

  const renderView = () => {
    switch (view) {
      case "home":          return <DailyLogView currentUser={currentUser} logs={logs} setLogs={setLogs} months={months} />;
      case "progress":      return <ProgressView currentUser={currentUser} logs={logs} months={months} />;
      case "analytics":     return <AnalyticsView currentUser={currentUser} logs={logs} allUsers={users} months={months} />;
      case "peers":         return <PeersView currentUser={currentUser} logs={logs} allUsers={users} months={months} />;
      case "notifications": return <NotificationsView currentUser={currentUser} notifications={notifications} setNotifications={setNotifications} allUsers={users} />;
      case "group":         return <GroupView currentUser={currentUser} logs={logs} notifications={notifications} setNotifications={setNotifications} allUsers={users} months={months} />;
      case "admin-users":   return <AdminUsers users={users} setUsers={setUsers} />;
      case "admin-months":  return <AdminMonths months={months} setMonths={setMonths} />;
      case "admin-reports": return <AdminReports users={users} logs={logs} months={months} />;
      default:              return <DailyLogView currentUser={currentUser} logs={logs} setLogs={setLogs} months={months} />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Sidebar currentUser={currentUser} active={view} setView={handleSetView} onLogout={handleLogout} unread={unread} months={months} />
      <main className="flex-1 overflow-y-auto">{renderView()}</main>
    </div>
  );
}
