-- ============================================================
-- RESET SEMUA TABEL (HAPUS DULU AGAR BERSIH)
-- ============================================================
DROP TABLE IF EXISTS daily_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS month_records CASCADE;
DROP TABLE IF EXISTS practices CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- 1. Tabel Practices (Amalan)
-- ============================================================
CREATE TABLE practices (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(10) NOT NULL,
    target INT NOT NULL,
    unit VARCHAR(10) NOT NULL
);

-- ============================================================
-- 2. Tabel Users (Pengguna)
-- ============================================================
CREATE TABLE users (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    coordinator_id VARCHAR(10) NULL,
    avatar VARCHAR(10) NOT NULL,
    CONSTRAINT valid_role CHECK (role IN ('user', 'coordinator', 'admin')),
    FOREIGN KEY (coordinator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- 3. Tabel Month Records (Bulan Aktif)
-- ============================================================
CREATE TABLE month_records (
    id VARCHAR(10) PRIMARY KEY,
    label VARCHAR(20) NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    days INT NOT NULL,
    CONSTRAINT valid_month CHECK (month BETWEEN 1 AND 12),
    CONSTRAINT valid_days CHECK (days BETWEEN 28 AND 31)
);

-- ============================================================
-- 4. Tabel Daily Logs (Log Harian)
-- ============================================================
CREATE TABLE daily_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(10) NOT NULL,
    log_date DATE NOT NULL,
    practice_id VARCHAR(10) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (practice_id) REFERENCES practices(id) ON DELETE CASCADE,
    CONSTRAINT unique_log UNIQUE (user_id, log_date, practice_id)
);

-- ============================================================
-- 5. Tabel Notifications (Notifikasi)
-- ============================================================
CREATE TABLE notifications (
    id VARCHAR(10) PRIMARY KEY,
    from_id VARCHAR(10) NOT NULL,
    to_id VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (from_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 6. Insert Data Practices (18 amalan) - AMAN DIULANG
-- ============================================================
INSERT INTO practices (id, name, icon, target, unit) VALUES
('p1', 'Tahajjud', '🤲', 15, 'days'),
('p2', 'Tilawah 5 halaman', '📖', 25, 'days'),
('p3', 'Sholat Rawatib min. 4 rakaat', '✨', 20, 'days'),
('p4', 'Subuh Berjamaah', '🕌', 30, 'days'),
('p5', 'Al Matsurat Pagi', '☀️', 25, 'days'),
('p6', 'Sholat Dhuha min. 4 rakaat', '☀️', 15, 'days'),
('p7', 'Puasa Sunnah', '🌙', 4, 'days'),
('p8', 'Qawiyyuljism', '💪', 10, 'days'),
('p9', 'Birrul Walidain', '❤️', 25, 'days'),
('p10', 'Infaq', '💵', 8, 'days'),
('p11', 'Datang Pembinaan Ontime', '⏰', 4, 'days'),
('p12', 'Dhuhur Berjamaah', '🕌', 30, 'days'),
('p13', 'Ashar Berjamaah', '🕌', 30, 'days'),
('p14', 'Maghrib Berjamaah', '🕌', 30, 'days'),
('p15', 'Al Matsurat Petang', '🌙', 25, 'days'),
('p16', 'Isya'' Berjamaah', '🕌', 30, 'days'),
('p17', 'Piket Harian', '🧹', 20, 'days'),
('p18', 'Membaca tentang keislaman', '📚', 15, 'days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. Insert Data Users - AMAN DIULANG
-- ============================================================
INSERT INTO users (id, name, email, role, coordinator_id, avatar) VALUES
('u1', 'Ahmad Yusuf', 'ahmad@example.com', 'admin', NULL, 'AY'),
('u2', 'Fatimah Noor', 'fatimah@example.com', 'coordinator', NULL, 'FN'),
('u3', 'Ibrahim Hassan', 'ibrahim@example.com', 'user', 'u2', 'IH'),
('u4', 'Maryam Saleh', 'maryam@example.com', 'user', 'u2', 'MS'),
('u5', 'Umar Khalid', 'umar@example.com', 'user', 'u2', 'UK'),
('u6', 'Zainab Ali', 'zainab@example.com', 'user', 'u2', 'ZA'),
('u7', 'Bilal Rahman', 'bilal@example.com', 'coordinator', NULL, 'BR'),
('u8', 'Khadijah Omar', 'khadijah@example.com', 'user', 'u7', 'KO')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. Insert Data Month Records - AMAN DIULANG
-- ============================================================
INSERT INTO month_records (id, label, year, month, active, days) VALUES
('m1', 'January 2025', 2025, 1, FALSE, 31),
('m2', 'February 2025', 2025, 2, FALSE, 28),
('m3', 'March 2025', 2025, 3, TRUE, 31)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. Insert Data Notifications - AMAN DIULANG
-- ============================================================
INSERT INTO notifications (id, from_id, to_id, message, sent_at, read) VALUES
('n1', 'u2', 'u5',
 'Assalamu Alaikum Umar. The month is ending in 5 days — let us make the most of it. Please try to complete your remaining practices.',
 '2025-03-26 09:14:00', FALSE),
('n2', 'u2', 'u4',
 'Dear Maryam, you are doing well but your Quran recitation target needs attention. Only 10 days remain this month.',
 '2025-03-25 18:30:00', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 10. Insert Contoh Daily Logs - AMAN DIULANG
-- ============================================================
INSERT INTO daily_logs (user_id, log_date, practice_id, completed) VALUES
('u3', '2025-03-01', 'p1', TRUE),
('u3', '2025-03-01', 'p2', TRUE),
('u3', '2025-03-01', 'p3', FALSE),
('u4', '2025-03-01', 'p1', TRUE),
('u5', '2025-03-02', 'p4', TRUE),
('u6', '2025-03-03', 'p5', TRUE),
('u8', '2025-03-04', 'p6', FALSE)
ON CONFLICT (user_id, log_date, practice_id) DO NOTHING;

-- ============================================================
-- 11. Buat Policy "ALLOW ALL" untuk SEMUA TABEL 
--     (Tanpa IF NOT EXISTS agar kompatibel dengan PG 14)
-- ============================================================
CREATE POLICY "Allow all users" ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all months" ON public.month_records
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all practices" ON public.practices
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all notifications" ON public.notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all daily_logs" ON public.daily_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- SELESAI
-- ============================================================