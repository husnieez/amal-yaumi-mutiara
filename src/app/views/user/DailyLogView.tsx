import { useState, useMemo } from "react";
import { UserRecord, DailyLog, MonthRecord, PRACTICES } from "../../lib/db";
import { getActiveMonth, dateKey, completedDays, pct } from "../../lib/utils";
import { DayPicker } from "../../components/shared/DayPicker";
import { CheckCircle, Calendar, Clock, Check } from "lucide-react";

export function DailyLogView({ currentUser, logs, setLogs, months }: {
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
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 space-y-12">
      
      {/* Top Area: Full-width Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side: Title & Metrics (Spans 8 columns on large screens) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between space-y-8">
          
          {/* Title Area */}
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-primary font-semibold mb-2">{activeMonth.label}</p>
            <h1 className="text-4xl lg:text-5xl font-light text-foreground mb-3" style={{ fontFamily: "'Crimson Pro', serif" }}>Daily Record</h1>
            <p className="text-sm md:text-base text-muted-foreground font-medium">
              {isToday ? "Today — " : ""}
              {new Date(activeMonth.year, activeMonth.month - 1, selectedDay).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>

          {/* 3 Metrics Cards */}
          <div className="grid grid-cols-3 gap-3 md:gap-5 mt-auto">
            {[
              { label: "Done today", value: `${totalDone} / ${PRACTICES.length}`, icon: CheckCircle, col: "text-primary" },
              { label: "Day of month", value: `${selectedDay} / ${activeMonth.days}`, icon: Calendar, col: "text-primary/70" },
              { label: "Days left", value: `${Math.max(0, activeMonth.days - today)}`, icon: Clock, col: "text-muted-foreground" },
            ].map(({ label, value, icon: Icon, col }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-center items-start md:items-center md:text-center">
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${col} mb-3 md:mb-4`} strokeWidth={1.5} />
                <p className="text-lg md:text-3xl font-mono font-bold text-foreground leading-none tracking-tight">{value}</p>
                <p className="text-[9px] md:text-xs text-muted-foreground mt-2 md:mt-3 font-bold uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>

        </div>

        {/* Right Side: Calendar Card (Spans 4 columns on large screens) */}
        <div className="lg:col-span-5 xl:col-span-4 h-full">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-full text-left">
            <div className="p-6 md:p-8 flex-1">
              <DayPicker month={activeMonth} selectedDay={selectedDay} onChange={setSelectedDay} markedDays={markedDays} />
            </div>
            <div className="bg-secondary/15 border-t border-border px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-primary/70" />
                <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground font-bold">Days Logged</p>
              </div>
              <p className="text-sm font-mono font-bold text-foreground">{markedDays.size} <span className="text-muted-foreground font-medium">/ {activeMonth.days}</span></p>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Area: Practices Grid */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-secondary/20 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">Practices Checklist</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Click any card to toggle completion for {isToday ? "today" : `day ${selectedDay}`}.</p>
          </div>
          {!isToday && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 animate-pulse">
              Editing Past Record (Day {selectedDay})
            </span>
          )}
        </div>
        
        {/* Full-width responsive grid */}
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {PRACTICES.map((p) => {
            const done = isDone(p.id);
            const monthDays = completedDays(logs, currentUser.id, p.id, activeMonth);
            const progress = pct(monthDays, p.target);
            
            return (
              <div
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`relative overflow-hidden p-4 border rounded-xl flex items-center gap-4 transition-all select-none cursor-pointer duration-200 hover:-translate-y-[2px]
                  ${done 
                    ? "bg-primary/5 border-primary/40 shadow-sm" 
                    : "bg-card border-border/80 hover:border-primary/40 hover:bg-secondary/30 hover:shadow-md"}`}
              >
                {/* Thin progress bar pinned to the bottom of the card */}
                <div className="absolute bottom-0 left-0 h-[3px] bg-secondary/80 w-full opacity-60">
                  <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                </div>

                <div className="shrink-0">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200
                    ${done 
                      ? "bg-primary text-primary-foreground border-primary scale-110 shadow-sm" 
                      : "border-muted-foreground/40 bg-card/50"}`}
                  >
                    {done && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                
                <span className="text-2xl shrink-0 leading-none select-none drop-shadow-sm">{p.icon}</span>
                
                <div className="flex-1 min-w-0 pr-1">
                  <p className={`text-sm leading-snug transition-colors truncate
                    ${done ? "text-foreground font-bold" : "text-muted-foreground font-semibold"}`} title={p.name}>
                    {p.name}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/80 mt-1 uppercase tracking-wider font-semibold">
                    <span className={monthDays >= p.target ? "text-primary font-bold" : ""}>{monthDays}</span> / {p.target} target
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
