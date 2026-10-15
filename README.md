# 🎾 PadelScore Pro

> **Aplikasi Manajemen Turnamen & Skor Padel Real-Time Berstandar Profesional**  
> *A professional-grade real-time Padel tournament management and live scoring platform.*

[![React 19](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com/)

---

## 📖 Tentang PadelScore Pro

**PadelScore Pro** adalah platform manajemen turnamen dan pencatatan skor padel all-in-one yang dirancang untuk klub, komunitas, dan turnamen resmi. Aplikasi ini mendukung sinkronisasi multi-lapangan secara *real-time*, integrasi daftar pemain instan dari platform Reclub, sistem perwasitan interaktif berbasis QR/Shortcode, serta algoritma matchmaking otomatis (Mexicano, Americano, Knockout, dan Mix).

---

## ✨ Fitur-Fitur Utama (Key Features)

### 🏆 1. Beragam Format Turnamen Padel
* **Mexicano (Dynamic Swiss-Style):** Penentuan pasangan dan lawan dinamis berdasarkan klasemen sementara (contoh: Peringkat 1 & 3 vs Peringkat 2 & 4) untuk pertandingan yang selalu seimbang dan kompetitif.
* **Americano (Classic Round-Robin):** Setiap pemain berpasangan dengan semua pemain lain secara bergantian.
* **Mix Formats (Gender Balanced):** Mode khusus *Mexicano Mix* dan *Americano Mix* yang memastikan komposisi putra dan putri seimbang di setiap lapangan.
* **Fixed Pairs (Pasangan Tetap):** Mode *Mexicano Fix* & *Americano Fix* untuk tim ganda yang sudah berpasangan tetap.
* **Club Formats:** Mode fleksibel *Club Random*, *Club Mexicano*, dan *Club Fix Americano*.
* **Knockout Bracket:** Sistem gugur interaktif lengkap dengan bagan turnamen (*bracket tree*).

### ⚡ 2. Multi-Court Stadium & Live Scoring
* **Dashboard Multi-Lapangan:** Pantau dan kelola hingga 8+ lapangan secara simultan dari satu layar stadion.
* **Realtime Sync via Supabase:** Setiap perubahan poin langsung diperbarui ke layar penonton dan dashboard admin tanpa perlu refresh.
* **Logika Skor Padel Otomatis:** Perhitungan poin standar (0, 15, 30, 40, Deuce/Golden Point), pergantian server, pergantian sisi lapangan (*side switch*), dan mode Tie-Break.

### 📱 3. Mode Wasit Mobile-First (Referee View)
* **Akses Cepat via QR / Link:** Wasit cukup scan QR Code di lapangan masing-masing untuk langsung masuk ke kontrol skor lapangan tersebut.
* **Antarmuka Ramah Sentuhan:** Tombol skor besar dan responsif dirancang khusus untuk kenyamanan wasit di pinggir lapangan.
* **Fitur Keamanan Pertandingan:** Tombol *Undo Point*, indikator *Server*, koreksi kesalahan skor, dan konfirmasi akhir pertandingan.

### 👥 4. Mode Penonton & Layar Publik (Spectator View)
* **Akses Shortcode Mudah:** Penonton cukup memasukkan kode unik (misal: `PADEL1`, `PRO1`) untuk melihat live score pertandingan favorit.
* **Tampilan TV / Projector Ready:** Desain dark mode elegan dengan aksen neon cyan (`#00ffcc`) yang tajam dan nyaman dilihat di layar proyektor atau TV klub.

### 🔄 5. Integrasi Pemain Instan via Reclub
* **Reclub URL Importer:** Cukup masukkan tautan (*link*) acara dari aplikasi **Reclub**, sistem akan otomatis menarik daftar hadir pemain dan foto profil pemain.
* **Text / Clipboard Fallback:** Opsi paste manual daftar nama pemain untuk kemudahan input massal.

### 📊 6. Klasemen Real-Time & Statistik Lengkap
* **Live Leaderboard:** Peringkat langsung terupdate setelah setiap game selesai.
* **Metrik Lengkap:** Total Poin, Game Menang/Kalah, Selisih Poin (*Point Difference*), dan Win Rate.
* **Podium Juara:** Tampilan podium khusus untuk Juara 1 (Gold), 2 (Silver), dan 3 (Bronze) lengkap dengan efek selebrasi.

### 🛡️ 7. Super Admin & Manajemen Sesi
* **Kontrol Berjenjang:** Dilindungi proteksi password terenkripsi SHA-256 untuk Super Admin.
* **Local-First & Cloud Persistence:** Data tersimpan aman di browser (`localStorage`) sekaligus tersinkronisasi otomatis ke server.
* **Auto-Cleanup & Matchup Customization:** Manajemen pembersihan turnamen kadaluarsa serta kemampuan mengganti susunan pemain di tengah turnamen (*Emergency Matchup Swap*).

---

## 🛠️ Tech Stack & Arsitektur

* **Frontend:** React 19, TypeScript, Vite 6
* **Styling & UI:** Tailwind CSS v4, Motion (Framer Motion), Lucide Icons, Google Material Symbols
* **Realtime Communication:** Supabase Realtime Channels (Broadcast & Presence)
* **Backend / API:** Express 5, Node.js, `tsx`
* **Utilities:** QRCode React, FingerprintJS, Canvas Confetti

---

## 🚀 Panduan Menjalankan Aplikasi (Local Setup)

### Prasyarat
- **Node.js** (versi 18 ke atas disarankan)
- **Git**

### Langkah Instalasi

1. **Clone repository:**
   ```bash
   git clone https://github.com/arsyarid1/PadelScorePro.git
   cd PadelScorePro
   ```

2. **Install dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variable:**
   Salin file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
   Isi konfigurasi Supabase (opsional jika menggunakan fitur Realtime Cloud):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   GEMINI_API_KEY=your-gemini-api-key
   ```

4. **Jalankan server aplikasi (Development Mode):**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000` (atau port yang ditentukan).

5. **Build untuk Production:**
   ```bash
   npm run build
   npm run preview
   ```

---

## 📱 Akses Mode Cepat (URL Shortcuts)

* **Dashboard Utama:** `http://localhost:3000/`
* **Live Match / Spectator:** `http://localhost:3000/live?code=PADEL1`
* **Mode Wasit Langsung:** `http://localhost:3000/referee?tournamentId={ID}&courtId={COURT_NO}`

---

## 📄 Lisensi

Didistribusikan di bawah lisensi MIT. Hak cipta © 2026 **PadelScore Pro Team**.
