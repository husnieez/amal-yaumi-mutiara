import { useState } from "react";
import { UserRecord, DailyLog, Notification, MonthRecord, PRACTICES } from "../../lib/db";
import { getActiveMonth, overallPct, completedDays, pct } from "../../lib/utils";
import { AvatarBadge } from "../../components/shared/AvatarBadge";
import { ProgressBar } from "../../components/shared/ProgressBar";
import { AlertCircle, Send, ChevronDown, X } from "lucide-react";

export function GroupView({ currentUser, logs, notifications, setNotifications, allUsers, months }: {
  currentUser: UserRecord; logs: DailyLog[]; notifications: Notification[]; setNotifications: (n: Notification[]) => void; allUsers: UserRecord[]; months: MonthRecord[];
}) {
  const activeMonth = getActiveMonth(months);
  const members = allUsers.filter((u) => u.role === "user");
  
  const [sendTo, setSendTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const sendNotification = () => {
    if (!sendTo || !message.trim()) return;
    setNotifications([...notifications, { id: `n${Date.now()}`, fromId: currentUser.id, toId: sendTo, message: message.trim(), sentAt: new Date().toISOString(), read: false }]);
    setMessage(""); setSendTo(null);
  };

  const atRisk = members.filter((u) => overallPct(logs, u.id, activeMonth) < 60);

  const presets = [
    { label: "✨ Remind Log", text: "Assalamu'alaikum, just a friendly reminder to log your daily practices today. Semoga istiqomah! ✨" },
    { label: "💪 Keep It Up", text: "MasyaAllah, great effort! Let's keep up the spirit and meet all your weekly targets! 💪" },
    { label: "⚠️ Low Progress", text: "Assalamu'alaikum, you are doing great, but some of your practices are below target. Let me know if you need any help! 🕌" }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary font-semibold mb-1">Coordinator Dashboard</p>
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>My Group</h1>
        <p className="text-sm text-muted-foreground mt-1">{members.length} members under your care</p>
      </div>

      {atRisk.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm animate-pulse">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Attention Needed</p>
            <p className="text-xs text-destructive/80 mt-1">
              <span className="font-semibold">{atRisk.map((u) => u.name.split(" ")[0]).join(", ")}</span> {atRisk.length === 1 ? "is" : "are"} below 60% completion rate this month. Consider sending them a friendly reminder.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Header container */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-secondary/20 flex justify-between items-center">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">Member Overview — {activeMonth.label}</p>
            <span className="text-xs font-mono text-muted-foreground font-semibold">{members.length} members</span>
          </div>

          <div className="divide-y divide-border">
            {members.map((member) => {
              const overall = overallPct(logs, member.id, activeMonth);
              const isExpanded = expandedUser === member.id;
              
              // Status Badge configuration
              let statusText = "On Track";
              let statusClass = "bg-primary/10 text-primary border-primary/25";
              if (overall < 60) {
                statusText = "At Risk";
                statusClass = "bg-destructive/10 text-destructive border-destructive/25";
              } else if (overall >= 85) {
                statusText = "Excellent";
                statusClass = "bg-emerald-500/10 text-emerald-500 border-emerald-500/25";
              }

              return (
                <div key={member.id} className="transition-all duration-200">
                  {/* Summary Header */}
                  <div 
                    onClick={() => setExpandedUser(isExpanded ? null : member.id)}
                    className="px-4 md:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <AvatarBadge initials={member.avatar} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold uppercase tracking-wider border ${statusClass}`}>
                            {statusText}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate font-medium">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                      <div className="text-right hidden xs:block">
                        <p className="text-sm font-mono font-semibold text-foreground">{overall}%</p>
                        <p className="text-[10px] text-muted-foreground font-medium">overall logs</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSendTo(member.id);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-xl hover:border-primary/50 hover:text-primary hover:bg-card transition-all font-semibold shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" /> Remind
                        </button>
                        
                        <div className="p-1 text-muted-foreground/60 hover:text-foreground hover:bg-secondary/40 rounded-full transition-colors">
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Details */}
                  {isExpanded && (
                    <div className="bg-secondary/10 border-t border-border px-5 py-5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80 font-bold mb-4">Detailed Practice Progress</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                        {PRACTICES.map((p) => {
                          const done = completedDays(logs, member.id, p.id, activeMonth);
                          const progress = pct(done, p.target);
                          return (
                            <div key={p.id} className="bg-card border border-border/60 rounded-xl p-3 text-center shadow-xs">
                              <span className="text-xl leading-none select-none block mb-1.5">{p.icon}</span>
                              <p className="text-[11px] font-semibold text-foreground truncate px-1" title={p.name}>{p.name}</p>
                              
                              <div className="my-2.5 px-1">
                                <ProgressBar value={progress} size="sm" />
                              </div>
                              
                              <p className="text-[10px] font-mono text-muted-foreground/85 font-semibold">{done} / {p.target}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sendTo && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-6">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 sm:p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Send reminder to</p>
                <p className="text-sm font-semibold text-foreground">{allUsers.find((u) => u.id === sendTo)?.name}</p>
              </div>
              <button 
                onClick={() => { setSendTo(null); setMessage(""); }} 
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Write your custom reminder message or choose a template below…" 
              rows={4}
              className="w-full bg-secondary border border-border rounded-xl p-3.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/45 transition-colors" 
            />

            {/* Presets List */}
            <div className="mt-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 font-semibold mb-2">Message Templates</p>
              <div className="flex flex-col gap-1.5">
                {presets.map((p, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setMessage(p.text)}
                    className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-primary bg-secondary/40 border border-border/50 rounded-lg hover:border-primary/30 transition-all font-medium truncate"
                  >
                    {p.label}: "{p.text}"
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button 
                onClick={() => { setSendTo(null); setMessage(""); }} 
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-muted-foreground border border-border hover:bg-secondary/50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={sendNotification} 
                disabled={!message.trim()} 
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm shadow-primary/20 transition-all disabled:opacity-40"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
