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
2. Jalankan `supabase/migrations/001_initial.sql`, `supabase/migrations/002_short_codes.sql`, `supabase/migrations/003_answer_threads.sql`, `supabase/migrations/004_private_rooms.sql`, `supabase/migrations/005_short_room_links.sql`, `supabase/migrations/006_site_engagement.sql`, lalu `supabase/migrations/007_realtime_updates.sql` secara berurutan, masing-masing sekali lewat **SQL Editor**. Untuk database yang sudah ada, jalankan hanya migration yang belum diterapkan.
3. Aktifkan **Authentication → Sign In / Providers → Anonymous Sign-ins**. Aplikasi membuat sesi anonim otomatis ketika pengguna pertama kali mengirim; tidak meminta email, nama, atau password.
4. Salin `.env.example` menjadi `.env`, lalu isi URL project dan **publishable key / anon key** dari project Supabase. Jangan gunakan `service_role` atau secret key.
5. Restart dev server.

```env
NUXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=KEY
```

Pertanyaan dan jawaban publik tersimpan di database dan dapat dibaca semua pengunjung. Isi ruang private hanya dapat dibaca sesi anggota ruang. RLS membatasi insert ke sesi anonim yang valid; column grants melarang pembacaan `author_id`; pengunjung tidak mendapat izin update/delete. Identitas tidak ditampilkan, tetapi Supabase menyimpan ID sesi anonim untuk kontrol akses. Anonim di antarmuka bukan jaminan tidak dapat dilacak penyedia layanan. Isi kiriman publik dapat dibaca siapa saja; isi ruang private dapat dibaca anggota yang mendapat tautan.

Cooldown database 30 detik per sesi berlaku untuk pertanyaan dan jawaban, termasuk request serentak. Untuk peluncuran publik dengan trafik besar, tambahkan CAPTCHA pada anonymous sign-in dan moderasi konten; cooldown sesi saja tidak mencegah orang membuat sesi baru. Hapus konten bermasalah melalui dashboard Supabase menggunakan akses admin. Bookmark hanya tersimpan di browser, tanpa sinkronisasi perangkat.

Setiap jawaban memiliki tombol **Balas** untuk melanjutkan percakapan dalam thread, termasuk membalas balasan. Migration 003 menambahkan relasi balasan dalam pertanyaan yang sama; jawaban lama tetap menjadi jawaban utama. Balasan ikut dihitung dalam jumlah jawaban dan mengikuti cooldown 30 detik. Mode demo menyimpan thread di browser.

## Ruang private dan nama samaran

Klik **Buat ruang private** di beranda, isi nama (misalnya “Tanya apa aja tentang gw!”) dan konteks, lalu bagikan tautan pendek `/r/AUIDWIG`. Kolom **Kode tautan** opsional: kosongkan untuk kode acak 7 huruf, atau isi kode sendiri seperti `tanya-gw` untuk `/r/tanya-gw`. Kode custom memakai 3–32 huruf, angka, atau tanda hubung, dan harus diawali/diakhiri huruf atau angka. Kode unik tanpa membedakan huruf besar/kecil; duplikat ditolak tanpa menghapus isian formulir. Setiap ruang memiliki daftar pertanyaan dan thread jawaban sendiri. Pertanyaan ruang tidak muncul di feed, pencarian, trending, bookmark publik, maupun tautan kode publik. Tautan pertanyaan dalam ruang menjadi `/r/KODE/KODE-PERTANYAAN`.

Jalankan migration **004_private_rooms.sql** setelah migration 003, lalu **005_short_room_links.sql**, sebelum menjalankan versi aplikasi ini dengan Supabase. Migration 005 memberi kode pendek pada room lama; tautan `/rooms/UUID` dan `/rooms/UUID/questions/KODE` tetap berfungsi dan mengarah ke alamat pendek. Room demo lama juga mendapat kode tanpa kehilangan isi, thread, atau nama samaran. Jawaban dan pertanyaan lama mendapat nama samaran tanpa mengubah isi atau hubungan thread. Nama samaran `anon-xxxxxxxx` dibuat oleh database dan tidak bisa dipilih atau dipalsukan lewat API. Satu sesi memakai nama samaran yang sama di seluruh percakapan dalam satu ruang; ruang lain mendapat nama berbeda. Di percakapan publik, nama samaran konsisten per pertanyaan. Menghapus penyimpanan browser atau memakai perangkat lain menghasilkan sesi dan nama baru.

Tautan ruang memakai kode pendek acak atau pilihan pembuat. Kode adalah alamat undangan, bukan password; kode custom yang mudah ditebak juga lebih mudah ditemukan. Token UUID lama tetap valid untuk kompatibilitas. Siapa pun yang memiliki atau menerima terusan tautan dapat bergabung; tidak ada password atau persetujuan pemilik. Setelah bergabung, sesi itu menjadi anggota ruang. RLS membatasi pembacaan dan kiriman ke anggota; tabel ruang, token, keanggotaan, dan pemetaan nama samaran tidak bisa didaftar dengan key publik. Pembuatan ruang mengikuti cooldown 30 detik yang sama dengan kiriman lain. Ruang tidak diindeks mesin pencari dan halaman menghindari pengiriman referrer. Aturan akses menggunakan [Supabase RLS dan column grants](https://supabase.com/docs/guides/database/postgres/row-level-security).

Mode demo menyimpan ruang dan nama samaran di browser pembuat. Tautan demo tidak membagikan data ke browser lain. Gunakan Supabase untuk ruang yang dapat digunakan beberapa orang.

## Hit counter dan reaksi hero

Hero beranda menampilkan jumlah kunjungan dan enam reaksi emoji (❤️ 😂 🔥 👏 🤯 😍). Setiap kali beranda dibuka atau direfresh menambah satu kunjungan; mengganti filter feed tidak dihitung sebagai kunjungan baru. Angka ini menghitung pembukaan beranda, bukan jumlah orang unik.

Pengunjung dapat memberi reaksi berkali-kali tanpa login dan tanpa cooldown kiriman. Klik/tap biasa mengirim satu reaksi. Tekan-tahan tombol emoji (mouse, sentuhan, Space, atau Enter) untuk mengirim reaksi otomatis berulang. Spam berhenti saat dilepas, digeser keluar tombol, dibatalkan oleh browser, kehilangan fokus, atau meninggalkan halaman. Tombol memakai file WebP animasi asli Google Noto yang tersimpan di `public/emoji/noto`, dengan gerakan dari frame gambar. Emoji juga melayang saat ditekan. Pengaturan reduced motion memilih PNG statis dan mematikan efek melayang; browser tanpa dukungan WebP mendapat PNG. Atribusi dan sumber berlisensi CC BY 4.0 ada di `public/emoji/noto/ATTRIBUTION.txt` dan ditautkan dari panel reaksi. Semua klik tetap dihitung meski jumlah emoji yang tampil bersamaan dibatasi untuk menjaga tampilan ringan.

Jalankan **006_site_engagement.sql** dan **007_realtime_updates.sql** sebelum memakai fitur ini dengan Supabase. Database menyimpan total agregat, tanpa identitas pengunjung atau daftar aktivitas. Increment dilakukan secara atomik melalui RPC; browser tidak bisa menulis langsung atau mengganti nilai counter. Klik cepat dikumpulkan menjadi batch kecil, kiriman pending diteruskan saat meninggalkan halaman, dan kegagalan kirim menyediakan tombol **Coba lagi**. Total diperbarui melalui Realtime, dengan rekonsiliasi cadangan setiap 30 detik.

Mode demo menyimpan hit dan reaksi di `dheepask-site-stats-v1` dalam browser. Supabase menyediakan angka bersama antar pengunjung. Data demo terpisah dari pertanyaan, thread, room, dan bookmark.

## Pembaruan realtime

Migration **007_realtime_updates.sql** mengaktifkan Supabase Realtime pada tabel `realtime_updates`. Feed, jumlah jawaban, pertanyaan, jawaban, balasan thread, room private, kunjungan dan reaksi diperbarui otomatis saat ada perubahan database. Edit/hapus oleh admin ikut tampil. Pembaruan percakapan mempertahankan draft dan form balasan yang terbuka. Kiriman sendiri tidak diduplikasi saat notifikasi diterima.

Tabel realtime hanya berisi topik, scope room dan nomor revisi; isi kiriman diambil ulang lewat query yang dilindungi RLS. Sinyal privat hanya dapat dibaca anggota room. Migration 007 menghapus tabel mentah aplikasi ini dari publication jika sebelumnya sudah diaktifkan, lalu mempublikasikan `realtime_updates`. Jangan aktifkan kembali publikasi tabel `questions`, `answers`, `rooms`, `room_members` atau `anonymous_names`: payload mentah dapat memuat ID penulis atau tautan privat. Tabel aplikasi lain dalam publication tetap dipertahankan. Publication harus memakai daftar tabel eksplisit, bukan `FOR ALL TABLES`. Ini mengikuti [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

Saat koneksi tersambung kembali atau tab kembali terlihat, data diambil ulang. Rekonsiliasi setiap 30 detik menjadi cadangan jika notifikasi terlewat atau Realtime belum tersedia. Klik reaksi tetap optimistis dan dikirim dalam batch; pembaruan dari pengunjung lain menunggu batch lokal selesai agar tidak menghilangkan klik yang belum tersimpan. Bookmark tetap lokal. Mode demo menyinkronkan perubahan melalui storage event antar tab pada browser yang sama; sinkronisasi antar perangkat membutuhkan Supabase. Pengujian lokal belum memverifikasi koneksi WebSocket ke project Supabase live.

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

`npm run test` juga menguji isolasi ruang private, penolakan baca/kirim tanpa undangan, nama samaran konsisten, dan privasi token/ID. Tes ini mengeksekusi migration pada PostgreSQL lokal melalui PGlite dan menguji baca publik, kiriman sesi anonim, privasi ID penulis, kepemilikan, jumlah jawaban, cooldown, serta penolakan update/delete.

Flow smoke browser tersedia di `tests/browser.spec.ts`:

```sh
npx playwright install chromium
npx playwright test
```

Tes browser membangun dan menjalankan preview produksi mode demo di port 3107, mencakup pertanyaan baru, jawaban, pencarian, bookmark, QR, navigasi mobile, dan animasi dengan preferensi reduced motion. Konfigurasi Supabase lokal tidak digunakan oleh tes ini. Verifikasi database live setelah setup: kirim pertanyaan pada satu browser, lihat/jawab pada browser lain, pastikan `select author_id` dan update/delete ditolak melalui key publik. Sesi yang baru mengirim perlu menunggu 30 detik sebelum mengirim lagi.

Daftar awal memuat maksimal 200 pertanyaan terbaru; percakapan memuat maksimal 500 jawaban. Link langsung tetap dapat membuka pertanyaan di luar daftar awal. Mode demo di-host hanya untuk mencoba antarmuka; gunakan Supabase untuk data bersama.

Panduan: [Nuxt deployment](https://nuxt.com/docs/4.x/getting-started/deployment), [Tailwind + Nuxt](https://tailwindcss.com/docs/installation/framework-guides/nuxt), [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
# dheepASK
