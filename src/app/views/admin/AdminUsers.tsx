import { useState, useEffect } from "react";
import { UserRecord, Role } from "../../lib/db";
import { AvatarBadge } from "../../components/shared/AvatarBadge";
import { Plus, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";

export function AdminUsers({ users, setUsers }: { users: UserRecord[]; setUsers: (u: UserRecord[]) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "user" as Role });
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    if (!openDropdownId) return;
    const handleClose = () => setOpenDropdownId(null);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, [openDropdownId]);
  
  const addUser = () => {
    if (!form.name || !form.email) return;
    const initials = form.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    setUsers([...users, { id: `u${Date.now()}`, ...form, avatar: initials }]);
    toast.success(`User ${form.name} berhasil ditambahkan!`);
    setForm({ name: "", email: "", role: "user" }); setShowAdd(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Administration</p>
          <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>User Management</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add user
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Members", value: users.filter((u) => u.role === "user").length },
          { label: "Coordinators", value: users.filter((u) => u.role === "coordinator").length },
          { label: "Admins", value: users.filter((u) => u.role === "admin").length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded p-4">
            <p className="text-2xl font-mono font-medium text-primary">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-lg">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">All accounts ({users.length})</p>
        </div>
        {users.map((user) => {
          const coord = users.find((c) => c.id === user.coordinatorId);
          return (
            <div key={user.id} className="px-5 py-3.5 border-b border-border last:border-0 first:rounded-t-lg last:rounded-b-lg flex items-center justify-between gap-3 bg-card hover:bg-secondary/15 transition-all duration-200">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <AvatarBadge initials={user.avatar} role={user.role} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{user.email}</p>
                  {coord && <p className="text-xs text-muted-foreground">Coord: {coord.name}</p>}
                </div>
              </div>
              
              <div className="relative shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdownId(openDropdownId === user.id ? null : user.id);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold font-mono uppercase tracking-wider border cursor-pointer select-none transition-all duration-200 active:scale-[0.97]
                    ${user.role === "admin" 
                      ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100/70 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 dark:hover:bg-red-950/40" 
                      : user.role === "coordinator" 
                        ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 dark:bg-primary/10 dark:text-primary dark:border-primary/20 dark:hover:bg-primary/20" 
                        : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80 dark:bg-secondary dark:text-muted-foreground dark:border-border dark:hover:bg-secondary/80"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    user.role === "admin" ? "bg-red-500 animate-pulse" : user.role === "coordinator" ? "bg-primary" : "bg-muted-foreground/60"
                  }`} />
                  <span>{{ admin: "Admin", coordinator: "Coord.", user: "Member" }[user.role]}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 text-muted-foreground/60 ${openDropdownId === user.id ? "rotate-180" : ""}`} />
                </button>

                {openDropdownId === user.id && (
                  <div className="absolute right-0 mt-2 w-40 bg-card/95 border border-border backdrop-blur-md rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150 origin-top-right">
                    {[
                      { value: "user", label: "Member", desc: "Akses standar", color: "bg-muted-foreground/60" },
                      { value: "coordinator", label: "Coord.", desc: "Koordinator grup", color: "bg-primary" },
                      { value: "admin", label: "Admin", desc: "Akses penuh sistem", color: "bg-red-500" },
                    ].map((opt) => {
                      const isSel = user.role === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            if (isSel) return;
                            setUsers(users.map((u) => u.id === user.id ? { ...u, role: opt.value as Role } : u));
                            toast.success(`Peran ${user.name.split(" ")[0]} diubah ke ${opt.label}`);
                            setOpenDropdownId(null);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-1.5 text-left hover:bg-secondary/60 dark:hover:bg-secondary/40 transition-colors cursor-pointer`}
                        >
                          <div className="flex flex-col">
                            <span className={`text-[11px] font-semibold ${isSel ? "text-primary" : "text-foreground"}`}>
                              {opt.label}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-light">{opt.desc}</span>
                          </div>
                          {isSel ? (
                            <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${opt.color} opacity-40 mr-1`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {showAdd && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-card border border-border rounded-lg w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-foreground mb-4" style={{ fontFamily: "'Crimson Pro', serif" }}>Add new user</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name"
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors" />
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address"
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors" />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors">
                <option value="user">Member</option>
                <option value="coordinator">Coordinator</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 text-sm text-muted-foreground border border-border rounded hover:bg-secondary/50 transition-colors">Cancel</button>
              <button onClick={addUser} className="flex-1 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
