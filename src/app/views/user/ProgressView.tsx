import { UserRecord, DailyLog, MonthRecord, PRACTICES } from "../../lib/db";
import { getActiveMonth, getShortPracticeName, completedDays, pct, logsForMonth } from "../../lib/utils";
import { ProgressBar } from "../../components/shared/ProgressBar";


export function ProgressView({ currentUser, logs, months }: { currentUser: UserRecord; logs: DailyLog[]; months: MonthRecord[] }) {
  const activeMonth = getActiveMonth(months);
  const chartData = PRACTICES.map((p) => {
    const done = completedDays(logs, currentUser.id, p.id, activeMonth);
    return { id: p.id, name: getShortPracticeName(p.name), done, target: p.target, pct: pct(done, p.target), icon: p.icon };
  });
  const overall = Math.round(chartData.reduce((s, d) => s + d.pct, 0) / chartData.length);
  const met = chartData.filter((d) => d.pct >= 100).length;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary font-semibold mb-1">{activeMonth.label}</p>
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>My Progress</h1>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        {[
          { label: "Overall completion", value: `${overall}%`, col: "text-primary" },
          { label: "Targets met", value: `${met} / ${PRACTICES.length}`, col: "text-foreground" },
          { label: "Days logged", value: `${new Set(logsForMonth(logs, currentUser.id, activeMonth).map((l) => l.date)).size} days`, col: "text-foreground" },
        ].map(({ label, value, col }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
            <p className={`text-2xl md:text-3xl font-mono font-semibold ${col}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">{label}</p>
          </div>
        ))}
      </div>
      
      {/* ✨ Ring Gauge Grid */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-5 mb-6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">Capaian vs Target</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Tap untuk detail masing-masing amalan</p>
          </div>
          <div className="text-2xl font-mono font-bold text-primary">{overall}%</div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {chartData.map((d) => {
            const r = 26;
            const circ = 2 * Math.PI * r;
            const filled = Math.min(d.pct, 100);
            const offset = circ * (1 - filled / 100);
            const color = d.pct >= 80 ? "#10b981" : d.pct >= 40 ? "var(--primary)" : "#f43f5e";
            const trackColor = d.pct >= 80 ? "#10b98122" : d.pct >= 40 ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "#f43f5e22";
            const pInfo = PRACTICES.find((p) => p.id === d.id) || PRACTICES[0];
            return (
              <div
                key={d.id}
                className="flex flex-col items-center gap-2 p-2.5 rounded-2xl bg-secondary/10 hover:bg-secondary/20 active:scale-95 transition-all duration-200 cursor-default"
              >
                {/* SVG Ring */}
                <div className="relative" style={{ width: 64, height: 64 }}>
                  <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
                    {/* Track */}
                    <circle cx="32" cy="32" r={r} fill="none" stroke={trackColor} strokeWidth="5" />
                    {/* Progress arc */}
                    <circle
                      cx="32" cy="32" r={r} fill="none"
                      stroke={color}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${circ}`}
                      strokeDashoffset={`${offset}`}
                      style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
                    />
                  </svg>
                  {/* Emoji center */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{pInfo.icon}</span>
                  </div>
                </div>
                {/* Pct */}
                <span className="text-xs font-mono font-bold leading-none" style={{ color }}>{d.pct}%</span>
                {/* Name */}
                <p className="text-[9px] text-muted-foreground text-center leading-tight" style={{ minHeight: 24, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {pInfo.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>


      {/* Practice breakdown */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-secondary/20">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">Practice Breakdown</p>
        </div>
        <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {chartData.map((d) => {
            const pInfo = PRACTICES.find((p) => p.id === d.id) || PRACTICES[0];
            return (
              <div key={d.id} className="p-3.5 border border-border/70 rounded-xl bg-card hover:bg-secondary/15 transition-colors flex items-center gap-3">
                <span className="text-xl shrink-0 leading-none">{pInfo.icon}</span>
                <div className="flex-1 min-w-0">
                  {/* Baris 1: Nama amalan penuh */}
                  <p className="text-sm font-semibold text-foreground mb-1 leading-snug">{pInfo.name}</p>
                  {/* Baris 2: Progress bar + stats */}
                  <ProgressBar value={d.pct} />
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] font-mono text-muted-foreground">{d.done} / {d.target} hari</span>
                    <span className={`text-[11px] font-mono font-bold
                      ${d.pct >= 80 ? "text-emerald-500" : d.pct >= 50 ? "text-primary" : "text-destructive"}`}>
                      {d.pct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
