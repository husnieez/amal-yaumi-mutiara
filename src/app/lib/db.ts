
import { supabase } from './supabase';

// ── Types ──────────────────────────────────────────────────────────────────
export type Role = 'admin' | 'coordinator' | 'user';

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
  id?: number;
  userId: string;
  date: string; // YYYY-MM-DD
  practiceId: string;
  completed: boolean;
}

export interface MonthRecord {
  id: string;
  label: string;
  year: number;
  month: number;
  active: boolean;
  days: number;
}

export interface Notification {
  id: string;
  fromId: string;
  toId: string;
  message: string;
  sentAt: string; // ISO datetime
  read: boolean;
}

// ── Fallback Constants ─────────────────────────────────────────────────────
export const PRACTICES: Practice[] = [
  { id: 'p1', name: 'Tahajjud', icon: '🤲', target: 15, unit: 'days' },
  { id: 'p2', name: 'Tilawah 5 halaman', icon: '📖', target: 25, unit: 'days' },
  { id: 'p3', name: 'Sholat Rawatib min. 4 rakaat', icon: '✨', target: 20, unit: 'days' },
  { id: 'p4', name: 'Subuh Berjamaah', icon: '🕌', target: 30, unit: 'days' },
  { id: 'p5', name: 'Al Matsurat Pagi', icon: '☀️', target: 25, unit: 'days' },
  { id: 'p6', name: 'Sholat Dhuha min. 4 rakaat', icon: '☀️', target: 15, unit: 'days' },
  { id: 'p7', name: 'Puasa Sunnah', icon: '🌙', target: 4, unit: 'days' },
  { id: 'p8', name: 'Qawiyyuljism', icon: '💪', target: 10, unit: 'days' },
  { id: 'p9', name: 'Birrul Walidain', icon: '❤️', target: 25, unit: 'days' },
  { id: 'p10', name: 'Infaq', icon: '💵', target: 8, unit: 'days' },
  { id: 'p11', name: 'Datang Pembinaan Ontime', icon: '⏰', target: 4, unit: 'days' },
  { id: 'p12', name: 'Dhuhur Berjamaah', icon: '🕌', target: 30, unit: 'days' },
  { id: 'p13', name: 'Ashar Berjamaah', icon: '🕌', target: 30, unit: 'days' },
  { id: 'p14', name: 'Maghrib Berjamaah', icon: '🕌', target: 30, unit: 'days' },
  { id: 'p15', name: 'Al Matsurat Petang', icon: '🌙', target: 25, unit: 'days' },
  { id: 'p16', name: "Isya' Berjamaah", icon: '🕌', target: 30, unit: 'days' },
  { id: 'p17', name: 'Piket Harian', icon: '🧹', target: 20, unit: 'days' },
  { id: 'p18', name: 'Membaca tentang keislaman', icon: '📚', target: 15, unit: 'days' },
];

// ── Database Fetch Helpers ────────────────────────────────────────────────
export async function fetchUsers(): Promise<UserRecord[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('Error fetching users detail:', error.message, error.details, error.hint, error);
    return [];
  }

  if (data && data.length > 0) {
    console.log('DEBUG: Users table columns:', Object.keys(data[0]));
    console.log('DEBUG: First user row:', data[0]);
    (window as any).rawUser = data[0];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as Role,
    coordinatorId: row.coordinator_id || undefined,
    avatar: row.avatar,
  }));
}

export async function fetchLogs(): Promise<DailyLog[]> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*');

  if (error) {
    console.error('Error fetching daily logs:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    date: row.log_date,
    practiceId: row.practice_id,
    completed: row.completed,
  }));
}

export async function fetchMonths(): Promise<MonthRecord[]> {
  const { data, error } = await supabase
    .from('month_records')
    .select('*')
    .order('year', { ascending: true })
    .order('month', { ascending: true });

  if (error) {
    console.error('Error fetching month records:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    label: row.label,
    year: row.year,
    month: row.month,
    active: row.active,
    days: row.days,
  }));
}

export async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*');

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    message: row.message,
    sentAt: row.sent_at,
    read: row.read,
  }));
}

export async function fetchPractices(): Promise<Practice[]> {
  const { data, error } = await supabase
    .from('practices')
    .select('*');

  if (error) {
    console.error('Error fetching practices:', error);
    return PRACTICES; // Fallback to memory list
  }

  if (!data || data.length === 0) {
    return PRACTICES;
  }

  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    target: row.target,
    unit: row.unit,
  }));
}

// ── Database Mutation Helpers ─────────────────────────────────────────────
export async function insertLog(log: DailyLog): Promise<void> {
  const { error } = await supabase
    .from('daily_logs')
    .upsert({
      user_id: log.userId,
      log_date: log.date,
      practice_id: log.practiceId,
      completed: log.completed,
    }, {
      onConflict: 'user_id,log_date,practice_id'
    });

  if (error) {
    console.error('Error inserting/upserting daily log:', error);
  }
}

export async function deleteLog(userId: string, date: string, practiceId: string): Promise<void> {
  const { error } = await supabase
    .from('daily_logs')
    .delete()
    .match({
      user_id: userId,
      log_date: date,
      practice_id: practiceId,
    });

  if (error) {
    console.error('Error deleting daily log:', error);
  }
}

export async function insertUser(user: UserRecord): Promise<void> {
  const { error } = await supabase
    .from('users')
    .insert({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      coordinator_id: user.coordinatorId || null,
      avatar: user.avatar,
    });

  if (error) {
    console.error('Error inserting user:', error);
  }
}

export async function updateUserRole(id: string, role: Role): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', id);

  if (error) {
    console.error('Error updating user role:', error);
  }
}

export async function insertMonth(month: MonthRecord): Promise<void> {
  const { error } = await supabase
    .from('month_records')
    .insert({
      id: month.id,
      label: month.label,
      year: month.year,
      month: month.month,
      active: month.active,
      days: month.days,
    });

  if (error) {
    console.error('Error inserting month record:', error);
  }
}

export async function setActiveMonth(id: string): Promise<void> {
  // First set active to false for all months
  const { error: error1 } = await supabase
    .from('month_records')
    .update({ active: false })
    .neq('id', id); // optimize or just update all except this one, or just update all

  if (error1) {
    console.error('Error disabling other months:', error1);
  }

  // Then set active to true for the selected month
  const { error: error2 } = await supabase
    .from('month_records')
    .update({ active: true })
    .eq('id', id);

  if (error2) {
    console.error('Error activating month:', error2);
  }
}

export async function insertNotification(notif: Notification): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .insert({
      id: notif.id,
      from_id: notif.fromId,
      to_id: notif.toId,
      message: notif.message,
      sent_at: notif.sentAt,
      read: notif.read,
    });

  if (error) {
    console.error('Error inserting notification:', error);
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);

  if (error) {
    console.error('Error marking notification read:', error);
  }
}
