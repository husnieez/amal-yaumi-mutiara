import { Role } from "../../lib/db";

export function AvatarBadge({ initials, size = "md", role }: { initials: string; size?: "sm" | "md" | "lg"; role?: Role }) {
  const sz = size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-9 h-9 text-sm";
  const ring = role === "admin" ? "ring-red-400/40" : role === "coordinator" ? "ring-primary/50" : "ring-border";
  return (
    <div className={`${sz} rounded-full bg-secondary flex items-center justify-center font-mono font-medium text-primary ring-1 ${ring} shrink-0`}>
      {initials}
    </div>
  );
}
