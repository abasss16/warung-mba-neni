# 🍽️ Warung Makan Bu Neni - Website Full Stack

Website pemesanan makanan online untuk Warung Makan Bu Neni dengan fitur lengkap.

## 🚀 Cara Menjalankan

### 1. Install Dependencies
```bash
npm install
```

### 2. Jalankan Server
```bash
npm start
```

### 3. Buka Browser
```
http://localhost:3000
```

---

## 👤 Akun Default

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@buneni.com | admin123 |

> Pengguna biasa bisa daftar sendiri melalui halaman Register

---

## 📱 Fitur Lengkap

### Halaman Pengguna:
- ✅ Register & Login
- ✅ Halaman Menu dengan kategori filter
- ✅ Keranjang belanja real-time
- ✅ Checkout dengan nomor meja & catatan
- ✅ Riwayat pesanan + update status real-time
- ✅ Tampilan mobile-friendly (responsive)

### Halaman Admin:
- ✅ Dashboard statistik (pesanan, pendapatan, menu, user)
- ✅ Kelola Menu: Tambah, Edit, Hapus (CRUD)
- ✅ Upload foto menu (maks 5MB)
- ✅ Manajemen Pesanan: update status, hapus
- ✅ Manajemen Pengguna: lihat & hapus
- ✅ Notifikasi real-time saat ada pesanan baru (Socket.IO)

---

## 🗄️ Database (db.json)

Menggunakan **lowdb** (JSON file database) dengan tabel:
- `users` - Data pengguna
- `menu` - Item menu
- `orders` - Pesanan (dengan items, total, status)
- `cart` - Keranjang belanja per user

---

## 📁 Struktur Folder

```
warung-bu-neni/
├── server.js          # Server utama (Express + Socket.IO)
├── db.js              # Database setup & seeding
├── db.json            # Database file (auto-generated)
├── package.json
├── public/
│   └── uploads/       # Foto menu yang diupload
└── README.md
```

---

## 🌐 Tema & Teknologi

- **Tema**: Biru langit (Sky Blue) - bersih dan segar
- **Backend**: Node.js + Express.js
- **Database**: lowdb (JSON)
- **Real-time**: Socket.IO
- **Auth**: express-session + bcryptjs
- **Upload**: Multer
- **Font**: Nunito + Playfair Display (Google Fonts)
- **Mobile**: Responsive CSS (mobile-first)
