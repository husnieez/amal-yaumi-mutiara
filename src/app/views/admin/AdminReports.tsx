import { useState, useMemo } from "react";
import { UserRecord, DailyLog, MonthRecord, Notification, PRACTICES } from "../../lib/db";
import { getActiveMonth, dateKey, completedDays, pct, overallPct } from "../../lib/utils";
import { AvatarBadge } from "../../components/shared/AvatarBadge";
import { ProgressBar } from "../../components/shared/ProgressBar";
import { Download, SlidersHorizontal, ChevronDown, TrendingUp, Users, Bell, Calendar, Search, X } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

export function AdminReports({ users, logs, months, notifications, onNavigateToPrint }: { 
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
