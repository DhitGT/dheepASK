# DheepASK

Aplikasi tanya jawab anonim berbahasa Indonesia dengan Nuxt terbaru, Tailwind CSS, dan Supabase. Responsive, tanpa login manual, siap di-hosting di Vercel.

## Jalankan lokal

Gunakan Node.js 22.19+ atau 24.11+ LTS, sesuai persyaratan Nuxt 4.5.2.

```sh
npm install
npm run dev
```

Tanpa environment Supabase, aplikasi masuk mode demo. Pertanyaan, jawaban, dan bookmark disimpan di browser ini. Mode demo tidak membagikan data antar pengguna. Jangan mengisi URL/key placeholder jika ingin mencoba demo.

## Hubungkan Supabase

1. Buat project Supabase.
2. Jalankan `supabase/migrations/001_initial.sql`, lalu `supabase/migrations/002_short_codes.sql`, masing-masing sekali lewat **SQL Editor**. Jika migration 001 sudah dijalankan, cukup jalankan **002**.
3. Aktifkan **Authentication → Sign In / Providers → Anonymous Sign-ins**. Aplikasi membuat sesi anonim otomatis ketika pengguna pertama kali mengirim; tidak meminta email, nama, atau password.
4. Salin `.env.example` menjadi `.env`, lalu isi URL project dan **publishable key / anon key** dari project Supabase. Jangan gunakan `service_role` atau secret key.
5. Restart dev server.

```env
NUXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=KEY
```

Pertanyaan dan jawaban tersimpan di database dan dapat dibaca publik. RLS membatasi insert ke sesi anonim yang valid; column grants melarang pembacaan `author_id`; pengunjung tidak mendapat izin update/delete. Identitas tidak ditampilkan, tetapi Supabase menyimpan ID sesi anonim untuk kontrol akses. Anonim di antarmuka bukan jaminan tidak dapat dilacak penyedia layanan. Isi pertanyaan/jawaban tetap publik: hindari informasi pribadi.

Cooldown database 30 detik per sesi berlaku untuk pertanyaan dan jawaban, termasuk request serentak. Untuk peluncuran publik dengan trafik besar, tambahkan CAPTCHA pada anonymous sign-in dan moderasi konten; cooldown sesi saja tidak mencegah orang membuat sesi baru. Hapus konten bermasalah melalui dashboard Supabase menggunakan akses admin. Bookmark hanya tersimpan di browser, tanpa sinkronisasi perangkat.

## Deploy Vercel

Tautan pertanyaan menggunakan 5 huruf, misalnya `https://domain.com/KTMXZ`. Huruf kecil/besar diterima saat membuka tautan atau mengetik kode; generator menghindari I, L, dan O. Di beranda ada input kode untuk membuka pertanyaan langsung. Halaman percakapan menyediakan tautan pendek, QR, serta unduhan QR PNG. QR dibuat di browser tanpa layanan pihak ketiga; alamat mengikuti domain yang sedang dibuka. Untuk QR yang bisa dibagikan ke orang lain, buat/unduh QR dari domain Vercel atau domain publik, bukan localhost.

Migration 002 memberikan kode unik untuk pertanyaan lama dan baru, tanpa mengganti UUID maupun relasi jawaban. Tautan lama `/questions/UUID` tetap berfungsi. Data demo lama di browser mendapat kode otomatis tanpa kehilangan jawaban/bookmark. Ruang kode 5 huruf (23 huruf yang mudah dibaca) memiliki kapasitas maksimal 6.436.343 pertanyaan; kode merupakan alamat publik, bukan password.

1. Push repository ke GitHub dan import project di Vercel.
2. Pilih framework **Nuxt.js** dan Node **22.x** atau **24.x**.
3. Isi kedua environment variable di atas pada Production/Preview sesuai kebutuhan.
4. Build command: `npm run build`. Biarkan Output Directory memakai default Nuxt. `vercel.json` sudah tersedia dan Nitro mendeteksi Vercel otomatis.
5. Deploy. Jika environment variable diubah, lakukan redeploy.

Tidak ada kredensial Supabase/Vercel yang disertakan. Tanpa keduanya, database live dan deployment belum dibuat.

## Verifikasi

```sh
npm run typecheck
npm run test
npm run build
```

`npm run test` mengeksekusi migration pada PostgreSQL lokal melalui PGlite dan menguji baca publik, kiriman sesi anonim, privasi ID penulis, kepemilikan, jumlah jawaban, cooldown, serta penolakan update/delete.

Flow smoke browser tersedia di `tests/browser.spec.ts`:

```sh
npx playwright install chromium
npx playwright test
```

Tes browser membangun dan menjalankan preview produksi mode demo di port 3107, mencakup pertanyaan baru, jawaban, pencarian, bookmark, QR, navigasi mobile, dan animasi dengan preferensi reduced motion. Konfigurasi Supabase lokal tidak digunakan oleh tes ini. Verifikasi database live setelah setup: kirim pertanyaan pada satu browser, lihat/jawab pada browser lain, pastikan `select author_id` dan update/delete ditolak melalui key publik. Sesi yang baru mengirim perlu menunggu 30 detik sebelum mengirim lagi.

Daftar awal memuat maksimal 200 pertanyaan terbaru; percakapan memuat maksimal 500 jawaban. Link langsung tetap dapat membuka pertanyaan di luar daftar awal. Mode demo di-host hanya untuk mencoba antarmuka; gunakan Supabase untuk data bersama.

Panduan: [Nuxt deployment](https://nuxt.com/docs/4.x/getting-started/deployment), [Tailwind + Nuxt](https://tailwindcss.com/docs/installation/framework-guides/nuxt), [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
# dheepASK
