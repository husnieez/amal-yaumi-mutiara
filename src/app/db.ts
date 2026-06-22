export type Role = "user" | "coordinator" | "admin";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  coordinatorId?: string;
  avatar: string;
}

export interface Practice {
  id: string;
  name: string;
  icon: string;
  target: number;
  unit: string;
}

export interface DailyLog {
  userId: string;
  date: string; // YYYY-MM-DD
  practiceId: string;
  completed: boolean;
}

export interface MonthRecord {
  id: string;
  label: string;
  year: number;
  month: number; // 1-based calendar month used for demo dates
  active: boolean;
  days: number; // days in this month
}

export interface Notification {
  id: string;
  fromId: string;
  toId: string;
  message: string;
  sentAt: string;
  read: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────
export const PRACTICES: Practice[] = [
  { id: "salah",   name: "Daily Prayer",       icon: "🤲", target: 30, unit: "days" },
  { id: "quran",   name: "Quran Recitation",   icon: "📖", target: 20, unit: "days" },
  { id: "dhikr",   name: "Dhikr / Remembrance",icon: "✨", target: 25, unit: "days" },
  { id: "fast",    name: "Voluntary Fasting",  icon: "🌙", target: 4,  unit: "days" },
  { id: "sadaqah", name: "Charity (Sadaqah)",  icon: "💛", target: 8,  unit: "days" },
];

const INITIAL_MONTHS: MonthRecord[] = [
  { id: "m1", label: "Muharram 1446",     year: 2025, month: 1, active: false, days: 30 },
  { id: "m2", label: "Safar 1446",        year: 2025, month: 2, active: false, days: 29 },
  { id: "m3", label: "Rabi al-Awwal 1446",year: 2025, month: 3, active: true,  days: 31 },
];

const INITIAL_USERS: UserRecord[] = [
  { id: "u1", name: "Ahmad Yusuf",    email: "ahmad@example.com",    role: "admin",       avatar: "AY" },
  { id: "u2", name: "Fatimah Noor",   email: "fatimah@example.com",  role: "coordinator", avatar: "FN" },
  { id: "u3", name: "Ibrahim Hassan", email: "ibrahim@example.com",  role: "user", coordinatorId: "u2", avatar: "IH" },
  { id: "u4", name: "Maryam Saleh",   email: "maryam@example.com",   role: "user", coordinatorId: "u2", avatar: "MS" },
  { id: "u5", name: "Umar Khalid",    email: "umar@example.com",     role: "user", coordinatorId: "u2", avatar: "UK" },
  { id: "u6", name: "Zainab Ali",     email: "zainab@example.com",   role: "user", coordinatorId: "u2", avatar: "ZA" },
  { id: "u7", name: "Bilal Rahman",   email: "bilal@example.com",    role: "coordinator", avatar: "BR" },
  { id: "u8", name: "Khadijah Omar",  email: "khadijah@example.com", role: "user", coordinatorId: "u7", avatar: "KO" },
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n1", fromId: "u2", toId: "u5",
    message: "Assalamu Alaikum Umar. The month is ending in 5 days — let us make the most of it. Please try to complete your remaining practices.",
    sentAt: "2025-03-26T09:14:00Z", read: false,
  },
  {
    id: "n2", fromId: "u2", toId: "u4",
    message: "Dear Maryam, you are doing well but your Quran recitation target needs attention. Only 10 days remain this month.",
    sentAt: "2025-03-25T18:30:00Z", read: true,
  },
];

const dateKey = (month: MonthRecord, day: number) =>
  `${month.year}-${String(month.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const generateLogs = (): DailyLog[] => {
  const logs: DailyLog[] = [];
  const rates: Record<string, Record<string, number>> = {
    u3: { salah: 0.93, quran: 0.75, dhikr: 0.85, fast: 0.5,  sadaqah: 0.6  },
    u4: { salah: 0.70, quran: 0.50, dhikr: 0.60, fast: 0.25, sadaqah: 0.4  },
    u5: { salah: 0.40, quran: 0.30, dhikr: 0.35, fast: 0.0,  sadaqah: 0.2  },
    u6: { salah: 0.85, quran: 0.90, dhikr: 0.80, fast: 0.75, sadaqah: 0.7  },
    u8: { salah: 0.60, quran: 0.55, dhikr: 0.50, fast: 0.25, sadaqah: 0.3  },
  };
  
  INITIAL_MONTHS.forEach((m) => {
    const daysToFill = m.active ? 21 : m.days;
    Object.entries(rates).forEach(([userId, r]) => {
      for (let day = 1; day <= daysToFill; day++) {
        const date = dateKey(m, day);
        PRACTICES.forEach((p) => {
          if (Math.random() < (r[p.id] ?? 0.5)) {
            logs.push({ userId, date, practiceId: p.id, completed: true });
          }
        });
      }
    });
  });
  return logs;
};

// ── Database Methods ────────────────────────────────────────────────────────
const KEYS = {
  USERS: "amal_tracker_users",
  LOGS: "amal_tracker_logs",
  MONTHS: "amal_tracker_months",
  NOTIFICATIONS: "amal_tracker_notifications",
  INITIALIZED: "amal_tracker_initialized",
};

export const initializeDatabase = () => {
  const isInitialized = localStorage.getItem(KEYS.INITIALIZED);
  if (!isInitialized) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(KEYS.MONTHS, JSON.stringify(INITIAL_MONTHS));
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem(KEYS.LOGS, JSON.stringify(generateLogs()));
    localStorage.setItem(KEYS.INITIALIZED, "true");
  }
};

export const loadUsers = (): UserRecord[] => {
  initializeDatabase();
  const data = localStorage.getItem(KEYS.USERS);
  return data ? JSON.parse(data) : INITIAL_USERS;
};

export const saveUsers = (users: UserRecord[]) => {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

export const loadLogs = (): DailyLog[] => {
  initializeDatabase();
  const data = localStorage.getItem(KEYS.LOGS);
  return data ? JSON.parse(data) : [];
};

export const saveLogs = (logs: DailyLog[]) => {
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
};

export const loadMonths = (): MonthRecord[] => {
  initializeDatabase();
  const data = localStorage.getItem(KEYS.MONTHS);
  return data ? JSON.parse(data) : INITIAL_MONTHS;
};

export const saveMonths = (months: MonthRecord[]) => {
  localStorage.setItem(KEYS.MONTHS, JSON.stringify(months));
};

export const loadNotifications = (): Notification[] => {
  initializeDatabase();
  const data = localStorage.getItem(KEYS.NOTIFICATIONS);
  return data ? JSON.parse(data) : INITIAL_NOTIFICATIONS;
};

export const saveNotifications = (notifications: Notification[]) => {
  localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
};
