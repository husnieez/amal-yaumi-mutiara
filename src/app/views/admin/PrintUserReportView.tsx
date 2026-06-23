import { useMemo } from "react";
import { UserRecord, Role, DailyLog, MonthRecord, PRACTICES } from "../../lib/db";
import { getActiveMonth, completedDays, pct, dateKey, getShortPracticeName, downloadPDF } from "../../lib/utils";
import { ChevronLeft, Download } from "lucide-react";
import { RolePill } from "../../components/shared/RolePill";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";

export function PrintUserReportView({ 
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

  const overall = Math.round(summaryData.reduce((s, d) => s + d.progress, 0) / summaryData.length) || 0;

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
