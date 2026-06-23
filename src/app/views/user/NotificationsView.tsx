import { UserRecord, Notification } from "../../lib/db";
import { AvatarBadge } from "../../components/shared/AvatarBadge";
import { Bell } from "lucide-react";

export function NotificationsView({ currentUser, notifications, setNotifications, allUsers }: {
  currentUser: UserRecord; notifications: Notification[]; setNotifications: (n: Notification[]) => void; allUsers: UserRecord[];
}) {
  const mine = notifications.filter((n) => n.toId === currentUser.id);
  const markRead = (id: string) => setNotifications(notifications.map((n) => n.id === id ? { ...n, read: true } : n));
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-10">
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Inbox</p>
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>Notifications</h1>
      </div>
      {mine.length === 0 ? (
        <div className="bg-card border border-border rounded p-8 text-center">
          <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mine.map((n) => {
            const from = allUsers.find((u) => u.id === n.fromId);
            return (
              <div key={n.id} className={`bg-card border rounded-lg p-5 transition-all ${n.read ? "border-border opacity-60" : "border-primary/20"}`}>
                <div className="flex items-start gap-3">
                  {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AvatarBadge initials={from?.avatar || "?"} size="sm" role={from?.role} />
                      <div>
                        <p className="text-xs font-medium text-foreground">{from?.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {new Date(n.sentAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{n.message}</p>
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="mt-3 text-xs text-muted-foreground hover:text-primary transition-colors font-mono">Mark as read</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
