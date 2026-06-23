import { useState } from "react";
import { UserRecord, DailyLog, MonthRecord, Notification, PRACTICES } from "../../lib/db";
import { getActiveMonth, dateKey, overallPct } from "../../lib/utils";
import { AvatarBadge } from "../../components/shared/AvatarBadge";
import { ProgressBar } from "../../components/shared/ProgressBar";
import { Search, Check, ChevronDown } from "lucide-react";

export function PeersView({ currentUser, logs, allUsers, months, notifications, setNotifications }: { 
  currentUser: UserRecord; 
  logs: DailyLog[]; 
  allUsers: UserRecord[]; 
  months: MonthRecord[];
  notifications: Notification[];
  setNotifications: (n: Notification[]) => void;
}) {
  const activeMonth = getActiveMonth(months);
  const peers = allUsers.filter((u) => u.role === "user" && u.id !== currentUser.id);
  const sorted = [...peers].sort((a, b) => overallPct(logs, b.id, activeMonth) - overallPct(logs, a.id, activeMonth));

  const [searchQuery, setSearchQuery] = useState("");
  const [cheeredUsers, setCheeredUsers] = useState<Record<string, boolean>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const filtered = sorted.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleCheer = (peerId: string) => {
    const newNotif = {
      id: `n_cheer_${Date.now()}_${peerId}`,
      fromId: currentUser.id,
      toId: peerId,
      message: `MasyaAllah! ${currentUser.name} mengirimkan Anda apresiasi atas konsistensi ibadah Anda. Tetap semangat ya! 🌟✨`,
      sentAt: new Date().toISOString(),
      read: false
    };
    setNotifications([...notifications, newNotif]);
    setCheeredUsers(prev => ({ ...prev, [peerId]: true }));
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <span className="text-xl" title="1st Place">🥇</span>;
    if (index === 1) return <span className="text-xl" title="2nd Place">🥈</span>;
    if (index === 2) return <span className="text-xl" title="3rd Place">🥉</span>;
    return <span className="text-xs font-mono text-muted-foreground/60 w-6 text-center font-bold">{index + 1}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Header and description */}
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary font-semibold mb-1">Community Hub</p>
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>Fellow Practitioners</h1>
        <p className="text-sm text-muted-foreground mt-1">Mutual visibility for motivation — may Allah bless and strengthen everyone's efforts.</p>
      </div>

      {/* Interactive Search Bar */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder="Search practitioners by name..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/45 shadow-sm"
        />
      </div>

      {/* Members Feed List */}
      <div className="space-y-4">
        {filtered.map((peer, idx) => {
          const overall = overallPct(logs, peer.id, activeMonth);
          const todayDate = dateKey(activeMonth, Math.min(new Date().getDate(), activeMonth.days));
          const peerLogsToday = logs.filter(l => l.userId === peer.id && l.date === todayDate && l.completed);
          const doneTodayCount = peerLogsToday.length;
          const cheered = cheeredUsers[peer.id];
          const isExpanded = expandedUser === peer.id;
          
          return (
            <div 
              key={peer.id} 
              className="bg-card border border-border rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              {/* Summary Card Header */}
              <div 
                onClick={() => setExpandedUser(isExpanded ? null : peer.id)}
                className="px-4 md:px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-secondary/10 transition-colors"
              >
                {/* Profile Details */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-8 shrink-0 flex items-center justify-center">
                    {getRankBadge(idx)}
                  </div>
                  
                  <AvatarBadge initials={peer.avatar} size="md" />
                  
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{peer.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                      {doneTodayCount} / {PRACTICES.length} completed today
                    </p>
                  </div>
                </div>
                
                {/* Monthly Progress Bar and Actions */}
                <div className="flex items-center gap-4 self-end md:self-auto shrink-0 w-full md:w-auto justify-between md:justify-end">
                  {/* Progress bar (hidden on small devices, visible on md+) */}
                  <div className="w-40 hidden sm:block">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground font-semibold">Monthly Progress</span>
                      <span className="text-xs font-mono font-bold text-primary">{overall}%</span>
                    </div>
                    <ProgressBar value={overall} size="sm" />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Cheer Button */}
                    <button
                      disabled={cheered}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheer(peer.id);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl transition-all font-semibold shadow-sm border shrink-0
                        ${cheered 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25 cursor-default hover:scale-100" 
                          : "bg-card border-border hover:border-primary/50 hover:text-primary hover:bg-secondary/10 hover:scale-[1.02] active:scale-[0.98]"}`}
                    >
                      {cheered ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3] animate-bounce" /> Sent
                        </>
                      ) : (
                        <>
                          <span>Cheer</span> 💖
                        </>
                      )}
                    </button>

                    <div className="p-1 text-muted-foreground/60 hover:text-foreground hover:bg-secondary/40 rounded-full transition-colors">
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable Details Grid */}
              {isExpanded && (
                <div className="bg-secondary/10 border-t border-border px-5 py-5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80 font-bold mb-4">Today's Completed Practices Details</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                    {PRACTICES.map((p) => {
                      const done = peerLogsToday.some(l => l.practiceId === p.id);
                      return (
                        <div 
                          key={p.id} 
                          className={`border rounded-xl p-3 text-center transition-all duration-200
                            ${done 
                              ? "bg-primary/5 border-primary/30 shadow-xs" 
                              : "bg-card border-border/40 opacity-40 grayscale"}`}
                        >
                          <span className="text-xl leading-none select-none block mb-1.5">{p.icon}</span>
                          <p className="text-[11px] font-semibold text-foreground truncate px-1" title={p.name}>{p.name}</p>
                          <span className="text-[9px] font-mono text-muted-foreground mt-1.5 block">
                            {done ? "Completed ✓" : "Not yet"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {filtered.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-8 text-center shadow-xs">
            <p className="text-sm text-muted-foreground font-medium">No practitioners match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
