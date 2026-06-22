# Spiritual Practice Tracking Platform (Amal Yaumi)

Platform pelacakan amalan harian (amal yaumi) untuk membina kedisiplinan spiritual anggota komunitas.  
Aplikasi ini dikembangkan sebagai **kontribusi nyata** untuk pengembangan **Asrama Mutiara** dan **YMMI** (Yayasan Mutiara Muda Indonesia) dalam rangka mendukung program pembinaan karakter dan ibadah harian.

## 🌱 Latar Belakang

Asrama Mutiara dan YMMI memiliki komitmen untuk mencetak generasi yang tidak hanya unggul secara akademik, tetapi juga memiliki kedekatan dengan nilai-nilai spiritual. Salah satu program unggulannya adalah *Amal Yaumi* – kebiasaan harian berbasis amalan sunnah dan wajib yang dicatat dan dievaluasi secara berkala.

Aplikasi ini hadir untuk memudahkan para pengurus, koordinator, dan peserta dalam:
- Mencatat amalan harian secara digital.
- Memantau progres individu dan kelompok.
- Memberikan pengingat dan motivasi melalui notifikasi.
- Menyediakan data yang transparan untuk evaluasi pembinaan.

Dengan semangat gotong royong, kami membangun aplikasi ini sebagai wujud kontribusi teknologi untuk kemajuan asrama dan yayasan.

## ✨ Fitur Utama

- **3 Peran Pengguna** – `user`, `coordinator`, `admin` dengan akses yang sesuai.
- **18 Amalan Harian** – Mulai dari Tahajjud, Tilawah, Sholat Berjamaah, hingga infak dan kebersihan.
- **Catatan Harian** – Setiap pengguna menandai amalan yang sudah dikerjakan per tanggal.
- **Bulan Aktif** – Admin dapat mengaktifkan bulan tertentu sebagai periode pencatatan.
- **Notifikasi Personal** – Koordinator mengirim pesan motivasi atau evaluasi ke peserta binaannya.
- **Dashboard Progres** – Melihat capaian harian, mingguan, dan bulanan.
- **Penyimpanan Lokal** – Menggunakan localStorage untuk prototyping, siap integrasi dengan PostgreSQL.

## 🛠️ Teknologi

- **Frontend**: React + TypeScript + Vite
- **State Management**: Context API
- **Storage**: localStorage (development), PostgreSQL (production – skema tersedia)
- **Styling**: Tailwind CSS (atau sesuai implementasi)

  ## Running the code

  Run `npm i` to install the dependencies.
  Run `npm run dev` to start the development server.
