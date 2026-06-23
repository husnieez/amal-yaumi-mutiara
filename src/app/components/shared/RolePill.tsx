import { Role } from "../../lib/db";

export function RolePill({ role }: { role: Role }) {
  const map = {
    admin: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/30",
    coordinator: "bg-primary/10 text-primary border-primary/20",
    user: "bg-secondary text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${map[role]}`}>
      {{ admin: "Admin", coordinator: "Coord.", user: "Member" }[role]}
    </span>
  );
}
