import { UserRecord, DailyLog, MonthRecord, PRACTICES } from "../../lib/db";
import { getActiveMonth, getShortPracticeName, completedDays, pct, logsForMonth } from "../../lib/utils";
import { ProgressBar } from "../../components/shared/ProgressBar";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

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
      
      {/* Recharts Chart */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-5 mb-6 shadow-sm overflow-hidden">
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
        <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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
