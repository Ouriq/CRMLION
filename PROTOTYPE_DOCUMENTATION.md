# Dokumentasi Prototipe CRM & After-Sales (Lion Solusi Sejahtera)

Dokumen ini menjelaskan struktur, arsitektur, dan fungsionalitas dari prototipe aplikasi CRM (Customer Relationship Management) yang telah dikembangkan. Prototipe ini difokuskan pada manajemen *End-to-End* dari mulai prospek penjualan hingga pemeliharaan pasca-penjualan (*After-Sales*).

---

## 1. Aktor & RBAC (Role-Based Access Control)

Sistem ini menerapkan pembatasan hak akses berbasis peran (RBAC) yang membagi pengguna ke dalam beberapa tingkatan wewenang.

| Peran (*Role*) | Deskripsi & Hak Akses |
| :--- | :--- |
| **Superadmin** | Memiliki akses penuh ke **seluruh** modul dalam sistem. Dapat melihat *Reports*, mereset data sistem, dan memonitor semua aktivitas tim. |
| **Sales Manager** | Memiliki akses identik dengan Superadmin dalam memonitor penjualan. Berhak melihat metrik dan grafik performa di modul *Reports*. Mengawasi seluruh siklus *pipeline* dan aktivitas. |
| **Leader Sales / Sales** | Staf lapangan/penjualan. Memiliki akses penuh pada *Sales Pipeline*, *Post-Sales*, *Contacts*, *Companies*, *Activities*, dan *Emails*. **Tidak memiliki akses** ke modul *Reports* (Laporan Manajerial). |
| **Teknisi** | Tim lapangan untuk instalasi dan servis. Hak akses **sangat dibatasi**. Saat login, Teknisi hanya dapat melihat halaman **Activities (Tasks)**. Mereka tidak dapat melihat nilai uang kesepakatan (*Deals*), *Pipeline* penjualan, ataupun daftar kontak rahasia. |

---

## 2. Struktur Modul & Halaman (*Pages*)

Aplikasi ini menggunakan konsep *Single Page Application* (SPA) dengan berbagai *state view*. Halaman-halaman utama meliputi:

### A. Layar Autentikasi & Navigasi
- **Login (`login`)**: Layar masuk utama dengan validasi kredensial.
- **Module Selector (`modules`)**: Layar pendaratan setelah login sukses yang menampilkan ikon modul (CRM, ERP, dll - saat ini fokus di CRM).

### B. Modul Inti CRM (Penjualan)
- **Sales Pipeline (`sales-pipeline`)**:
  - Tampilan papan *Kanban* (Drag & Drop).
  - Kolom tahap: *Leads* ➔ *Prospecting* ➔ *Proposal SPH* ➔ *Negotiation* ➔ *Closed Won* ➔ *Closed Lost*.
  - Fitur: Penjadwalan meeting, Log Aktivitas (Riwayat Timeline), dan tombol "Kirim Tugas Teknisi" jika Deal dimenangkan.
- **Post-Sales Pipeline (`post-sales`)**:
  - Papan *Kanban* untuk proses pemenuhan barang dan penagihan.
  - Kolom tahap: *Menunggu Pengiriman* ➔ *Menunggu BAST* ➔ *Siap Ditagih* ➔ *Menunggu Pembayaran* ➔ *Lunas*.
  - Fitur: Pengingat *Repeat Order* saat digeser ke Lunas.
- **Contacts & Companies (`contacts` / `companies`)**:
  - Database relasional sederhana untuk mencatat detail perorangan dan perusahaan.

### C. Modul Komando & Eksekusi Lapangan
- **Activities & Tasks (`activities`)**:
  - Merupakan **Pusat Komando (Command Center)** baik bagi tim Sales maupun Teknisi.
  - Memiliki dua Mode: **Calendar View** (tampilan kalender bulanan) dan **Tasks View** (tabel rincian tugas).
  - **Fungsionalitas**: 
    - Sales dapat membuat jadwal tugas secara manual (Pemasangan, Maintenance Berkala, Kunjungan Rutin) melalui tombol `+ Task`.
    - Dropdown filter cerdas untuk memilah jenis tugas.
    - Pendeteksi *Overdue* (Tanggal merah jika terlambat, kuning jika hari ini).
    - Teknisi membuka laporan dari halaman ini dan menekan "Selesai", yang otomatis memicu perubahan status di *pipeline* Sales.
- **Emails (`emails`)**:
  - Simulator mass-emailing dan penjadwalan (*Scheduled Email*). Berguna untuk pengiriman proposal otomatis.

### D. Modul Manajerial
- **Reports (`reports`)**:
  - *Dashboard* grafik visual (menggunakan Recharts).
  - Menampilkan metrik *Revenue*, Persentase Konversi, serta tombol Cetak/Export ke PDF.

---

## 3. Alur Kerja (Workflow) Unggulan

### Workflow 1: Pendelegasian Pemasangan Otomatis
1. Sales menggeser Deal ke **Closed Won**.
2. Sales menekan "Kirim ke Teknisi". Modal muncul untuk mengisi detail pemasangan/pengiriman.
3. Tugas terlempar ke layar **Activities** milik Teknisi.
4. Teknisi berangkat, selesai bekerja, menekan tombol "Laporan" dan menyelesaikannya.
5. Sistem otomatis menggeser Deal di layar Sales menuju **Menunggu BAST** atau tahap selanjutnya, disertai penambahan Log Aktivitas fiktif sebagai jejak rekam.

### Workflow 2: After-Sales & Maintenance Monitoring
1. Tim Sales dapat mendaftarkan jadwal servis klien di halaman **Activities**.
2. Tugas ini ditandai sebagai *Maintenance* atau *Kunjungan Rutin*.
3. Pada halaman *Activities*, sistem mewarnai baris tugas menjadi **Merah (Overdue)** jika jadwal tersebut terlewat.
4. Sistem memisahkan secara ketat (lewat filter Peran) agar tugas *Follow-up Sales* tidak terlihat oleh Teknisi, namun tugas *Maintenance* tetap terlihat oleh Teknisi.

### Workflow 3: Siklus *Repeat Order*
1. Ketika invoice sudah dibayar klien (Deal digeser ke **Lunas**).
2. Sistem akan memunculkan penawaran otomatis untuk menjadwalkan *Follow-up Repeat Order* beberapa bulan ke depan.
3. Jika disetujui, jadwal *follow-up* ini masuk ke kalender Sales, membiasakan proses *retention* otomatis tanpa perlu diingat secara manual.

---

## 4. Basis Teknologi
- **Framework**: React (dengan Vite) & TypeScript.
- **Styling**: Vanilla CSS (Fleksibel dan Cepat).
- **State Management & Database**: React `useState/useEffect` yang disinkronisasi ke dalam Browser `localStorage` sebagai representasi *database backend* (*Persistent Storage*).
- **Libraries**: `recharts` (Grafik), `html2pdf.js` (Export PDF).
