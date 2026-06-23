export function ProgressBar({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-1" : "h-1.5";
  const col = value >= 80 ? "bg-emerald-400" : value >= 50 ? "bg-primary" : "bg-red-400/70";
  return (
    <div className={`w-full ${h} rounded-full bg-secondary overflow-hidden`}>
      <div className={`${h} ${col} rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
    </div>
  );
}
