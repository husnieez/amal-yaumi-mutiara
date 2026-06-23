import { MonthRecord } from "../../lib/db";

export function DayPicker({ month, selectedDay, onChange, markedDays }: {
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
