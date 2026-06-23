import { useState, useMemo, useEffect } from "react";
import { Toaster } from "sonner";
import { Moon } from "lucide-react";

import {
  UserRecord, DailyLog, MonthRecord, Notification,
  fetchUsers, fetchLogs, fetchMonths, fetchNotifications,
  insertLog, deleteLog, insertUser, updateUserRole, insertMonth,
  setActiveMonth, insertNotification, markNotificationRead
} from "./lib/db";

import { LoginScreen } from "./components/shared/LoginScreen";
import { Sidebar } from "./components/shared/Sidebar";

import { DailyLogView } from "./views/user/DailyLogView";
import { ProgressView } from "./views/user/ProgressView";
import { AnalyticsView } from "./views/user/AnalyticsView";
import { PeersView } from "./views/user/PeersView";
import { NotificationsView } from "./views/user/NotificationsView";

import { GroupView } from "./views/coordinator/GroupView";

import { AdminUsers } from "./views/admin/AdminUsers";
import { AdminMonths } from "./views/admin/AdminMonths";
import { AdminReports } from "./views/admin/AdminReports";
import { PrintUserReportView } from "./views/admin/PrintUserReportView";
import { PrintAdminReportView } from "./views/admin/PrintAdminReportView";

export default function App() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return localStorage.getItem("amal_tracker_current_user_id");
  });
  const [view, setView] = useState(() => {
    return localStorage.getItem("amal_tracker_current_view") || "home";
  });
  const [logs, setLogsState] = useState<DailyLog[]>([]);
  const [users, setUsersState] = useState<UserRecord[]>([]);
  const [months, setMonthsState] = useState<MonthRecord[]>([]);
  const [notifications, setNotificationsState] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [printUserId, setPrintUserId] = useState<string | null>(null);
  const [printMonthId, setPrintMonthId] = useState<string | null>(null);
  const [printFromView, setPrintFromView] = useState<string>("home");

  // Load data from Supabase on mount
  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [u, l, m, n] = await Promise.all([
          fetchUsers(),
          fetchLogs(),
          fetchMonths(),
          fetchNotifications(),
        ]);
        if (active) {
          setUsersState(u);
          setLogsState(l);
          setMonthsState(m);
          setNotificationsState(n);
        }
      } catch (error) {
        console.error("Error loading data from Supabase:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const currentUser = useMemo(() => users.find((u) => u.id === currentUserId) || null, [users, currentUserId]);

  const setLogs = async (newLogs: DailyLog[]) => {
    // Determine the difference between logs and newLogs
    const added = newLogs.find(
      (n) => !logs.some((o) => o.userId === n.userId && o.practiceId === n.practiceId && o.date === n.date)
    );
    const removed = logs.find(
      (o) => !newLogs.some((n) => o.userId === n.userId && o.practiceId === n.practiceId && o.date === n.date)
    );

    // Optimistically update frontend state
    setLogsState(newLogs);

    if (added) {
      await insertLog(added);
    } else if (removed) {
      await deleteLog(removed.userId, removed.date, removed.practiceId);
    }
  };

  const setUsers = async (newUsers: UserRecord[]) => {
    const added = newUsers.find((n) => !users.some((o) => o.id === n.id));
    const updated = newUsers.find((n) => {
      const o = users.find((x) => x.id === n.id);
      return o && (o.role !== n.role || o.coordinatorId !== n.coordinatorId);
    });

    setUsersState(newUsers);

    if (added) {
      await insertUser(added);
    } else if (updated) {
      await updateUserRole(updated.id, updated.role);
    }
  };

  const setMonths = async (newMonths: MonthRecord[]) => {
    const added = newMonths.find((n) => !months.some((o) => o.id === n.id));
    const activated = newMonths.find((n) => n.active && !months.find((o) => o.id === n.id)?.active);

    setMonthsState(newMonths);

    if (added) {
      await insertMonth(added);
    }
    if (activated) {
      await setActiveMonth(activated.id);
    }
  };

  const setNotifications = async (newNotifications: Notification[]) => {
    const added = newNotifications.find((n) => !notifications.some((o) => o.id === n.id));
    const readUpdated = newNotifications.find((n) => n.read && !notifications.find((o) => o.id === n.id)?.read);

    setNotificationsState(newNotifications);

    if (added) {
      await insertNotification(added);
    } else if (readUpdated) {
      await markNotificationRead(readUpdated.id);
    }
  };

  const handleLogin = (u: UserRecord) => {
    setCurrentUserId(u.id);
    localStorage.setItem("amal_tracker_current_user_id", u.id);
    const initialView = u.role === "admin" ? "admin-users" : "home";
    setView(initialView);
    localStorage.setItem("amal_tracker_current_view", initialView);
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    localStorage.removeItem("amal_tracker_current_user_id");
    setView("home");
    localStorage.removeItem("amal_tracker_current_view");
  };

  const handleSetView = (v: string) => {
    setView(v);
    localStorage.setItem("amal_tracker_current_view", v);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card border border-primary/20 mb-4 shadow-sm animate-pulse">
            <Moon className="w-8 h-8 text-primary animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <h2 className="text-lg font-light text-foreground mb-1" style={{ fontFamily: "'Crimson Pro', serif" }}>Memuat Data...</h2>
          <p className="text-xs text-muted-foreground font-mono">Menghubungkan ke Supabase</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} users={users} />;
  }

  const unread = notifications.filter((n) => n.toId === currentUser.id && !n.read).length;

  const handleNavigateToPrint = (userId: string | null, monthId: string, fromView: string) => {
    setPrintUserId(userId);
    setPrintMonthId(monthId);
    setPrintFromView(fromView);
    handleSetView(userId ? "print-user-report" : "print-admin-report");
  };

  const renderView = () => {
    switch (view) {
      case "home":          return <DailyLogView currentUser={currentUser} logs={logs} setLogs={setLogs} months={months} />;
      case "progress":      return <ProgressView currentUser={currentUser} logs={logs} months={months} />;
      case "analytics":     return <AnalyticsView currentUser={currentUser} logs={logs} allUsers={users} months={months} onNavigateToPrint={handleNavigateToPrint} />;
      case "peers":         return <PeersView currentUser={currentUser} logs={logs} allUsers={users} months={months} notifications={notifications} setNotifications={setNotifications} />;
      case "notifications": return <NotificationsView currentUser={currentUser} notifications={notifications} setNotifications={setNotifications} allUsers={users} />;
      case "group":         return <GroupView currentUser={currentUser} logs={logs} notifications={notifications} setNotifications={setNotifications} allUsers={users} months={months} />;
      case "admin-users":   return <AdminUsers users={users} setUsers={setUsers} />;
      case "admin-months":  return <AdminMonths months={months} setMonths={setMonths} />;
      case "admin-reports": return <AdminReports users={users} logs={logs} months={months} notifications={notifications} onNavigateToPrint={handleNavigateToPrint} />;
      case "print-user-report":
        return <PrintUserReportView 
          userId={printUserId!} 
          monthId={printMonthId!} 
          onBack={() => handleSetView(printFromView)} 
          allUsers={users}
          logs={logs}
          months={months}
        />;
      case "print-admin-report":
        return <PrintAdminReportView 
          monthId={printMonthId!} 
          onBack={() => handleSetView(printFromView)} 
          users={users}
          logs={logs}
          months={months}
          notifications={notifications}
        />;
      default:              return <DailyLogView currentUser={currentUser} logs={logs} setLogs={setLogs} months={months} />;
    }
  };

  const isPrintView = view === "print-user-report" || view === "print-admin-report";

  return (
    <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Toaster position="top-center" richColors />
      {!isPrintView && (
        <Sidebar currentUser={currentUser} active={view} setView={handleSetView} onLogout={handleLogout} unread={unread} months={months} />
      )}
      <main className={`flex-1 overflow-y-auto ${!isPrintView ? "pt-14 pb-20 md:pt-0 md:pb-0" : ""}`}>
        {renderView()}
      </main>
    </div>
  );
}
