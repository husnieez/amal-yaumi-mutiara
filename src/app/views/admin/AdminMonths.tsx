import { useState } from "react";
import { MonthRecord } from "../../lib/db";
import { Plus, Calendar } from "lucide-react";

export function AdminMonths({ months, setMonths }: { months: MonthRecord[]; setMonths: (m: MonthRecord[]) => void }) {
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
