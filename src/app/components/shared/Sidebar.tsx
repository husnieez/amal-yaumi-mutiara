import { UserRecord, MonthRecord } from "../../lib/db";
import { getActiveMonth } from "../../lib/utils";
import { AvatarBadge } from "./AvatarBadge";
import { RolePill } from "./RolePill";
import {
  BookOpen, Moon, Users, Bell, LogOut,
  BarChart2, Calendar, Shield, User, TrendingUp
} from "lucide-react";

export function Sidebar({ currentUser, active, setView, onLogout, unread, months }: {
  currentUser: UserRecord; active: string; setView: (v: string) => void; onLogout: () => void; unread: number; months: MonthRecord[];
}) {
  const userLinks = [
    { id: "home",          label: "Daily Log",     icon: BookOpen },
    { id: "progress",      label: "My Progress",   icon: TrendingUp },
    { id: "analytics",     label: "Analytics",     icon: BarChart2 },
    { id: "peers",         label: "Community",     icon: Users },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unread },
  ];
  const coordLinks = [
    { id: "home",          label: "Daily Log",     icon: BookOpen },
    { id: "progress",      label: "My Progress",   icon: TrendingUp },
    { id: "analytics",     label: "Analytics",     icon: BarChart2 },
    { id: "group",         label: "My Group",      icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unread },
    { id: "admin-months",  label: "Months",        icon: Calendar },
  ];
  const adminLinks = [
    { id: "admin-users",   label: "Users",   icon: User },
    { id: "admin-months",  label: "Months",  icon: Calendar },
    { id: "admin-reports", label: "Reports", icon: BarChart2 },
  ];
  const links = currentUser.role === "admin" ? adminLinks : currentUser.role === "coordinator" ? coordLinks : userLinks;
  const am = getActiveMonth(months);

  return (
    <>
      {/* Desktop Sidebar (Hidden on mobile) */}
      <aside className="hidden md:flex w-56 shrink-0 bg-background border-r border-border flex-col h-screen sticky top-0" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif", fontSize: "1.1rem" }}>Amal</span>
            <span className="text-xs font-mono text-muted-foreground ml-auto">{am.label.split(" ")[0]}</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {currentUser.role === "admin" && (
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-2 pb-2 pt-1">Administration</p>
          )}
          {links.map(({ id, label, icon: Icon, badge }: any) => (
            <button key={id} onClick={() => setView(id)}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded text-sm transition-all text-left
                ${active === id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-mono flex items-center justify-center">{badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-border">
          <div className="flex items-center gap-2.5 px-2 mb-3">
            <AvatarBadge initials={currentUser.avatar} role={currentUser.role} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{currentUser.name}</p>
              <RolePill role={currentUser.role} />
            </div>
          </div>
          <button onClick={onLogout}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-primary" />
          <span className="text-base font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif", fontSize: "1.1rem" }}>Amal</span>
        </div>
        <div className="flex items-center gap-3">
          <AvatarBadge initials={currentUser.avatar} role={currentUser.role} />
          <button onClick={onLogout} className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/80 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-background/90 backdrop-blur-md border-t border-border flex items-center justify-around px-1 pb-safe z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        {links.map(({ id, label, icon: Icon, badge }: any) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => setView(id)} className="relative flex flex-1 flex-col items-center justify-center py-2 min-w-0 transition-colors">
              <div className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all duration-300 ${isActive ? "bg-primary/10 text-primary scale-110" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className={`w-5 h-5 mb-1 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} />
                {/* Only show label if there's enough space, typically hide or truncate on small screens. We'll show a tiny version. */}
                <span className={`text-[9px] font-medium tracking-wide truncate max-w-full px-1 ${isActive ? "font-bold" : ""}`}>
                  {label}
                </span>
                {badge > 0 && (
                  <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] font-mono font-bold flex items-center justify-center shadow-sm border border-background">
                    {badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </>
  );
}
