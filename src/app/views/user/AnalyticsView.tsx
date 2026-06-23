import { useState, useMemo } from "react";
import { UserRecord, DailyLog, MonthRecord, PRACTICES } from "../../lib/db";
import { getActiveMonth, dateKey, completedDays, pct, getShortPracticeName } from "../../lib/utils";
import { AvatarBadge } from "../../components/shared/AvatarBadge";
import { ProgressBar } from "../../components/shared/ProgressBar";
import { ChevronDown, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";

export function AnalyticsView({ currentUser, logs, allUsers, months, onNavigateToPrint }: {
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
    <div id="user-report-pdf-content" className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Header + controls */}
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-primary font-semibold mb-1">Analytics</p>
          <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
            {subject.id === currentUser.id ? "My Analytics" : `${subject.name.split(" ")[0]}'s Analytics`}
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: "Overall", value: `${overall}%`, col: overall >= 75 ? "text-emerald-500" : overall >= 50 ? "text-primary" : "text-destructive" },
          { label: "Current streak", value: `${streak} days`, col: "text-primary" },
          { label: "Days logged", value: `${new Set(logs.filter((l) => l.userId === subject.id && l.date.startsWith(`${month.year}-${String(month.month).padStart(2,"0")}`)).map((l) => l.date)).size} days`, col: "text-foreground" },
          { label: "Targets met", value: `${summaryData.filter((d) => d.progress >= 100).length} / ${PRACTICES.length}`, col: "text-foreground" },
        ].map(({ label, value, col }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow">
            <p className={`text-xl md:text-2xl font-mono font-semibold ${col}`}>{value}</p>
            <p className="text-[10px] md:text-[11px] text-muted-foreground mt-1.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Daily trend chart */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-5 mb-6 shadow-sm overflow-hidden">
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
      <div className="bg-card border border-border rounded-xl p-4 md:p-5 mb-6 shadow-sm overflow-hidden">
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
        <div className="p-4 md:p-5 overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
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
        <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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
