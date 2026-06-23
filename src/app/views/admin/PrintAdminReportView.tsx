import { useMemo } from "react";
import { UserRecord, DailyLog, MonthRecord, Notification, PRACTICES } from "../../lib/db";
import { getActiveMonth, dateKey, completedDays, pct, getShortPracticeName, overallPct, downloadPDF } from "../../lib/utils";
import { ChevronLeft, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";

export function PrintAdminReportView({ 
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
