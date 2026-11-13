# 🏙️ Bot Moderator & Multi-Fungsi • Wander Roleplay (FiveM)

Bot Discord resmi untuk server **Wander Roleplay (FiveM)** yang dibangun menggunakan **TypeScript** dan dioptimalkan untuk **Bun Runtime** (sangat cocok untuk di-deploy pada **Pterodactyl Bun Egg**). Menggunakan database **SQLite** mandiri berkecepatan tinggi tanpa memerlukan setup database eksternal yang rumit.

---

## ✨ Fitur Utama

1. **🛡️ Moderasi Ketat (Owner & Administrator Only)**
   - Semua perintah moderasi & kontrol administratif dilindungi secara ketat. Hanya **Server Owner** dan akun yang memiliki izin **Administrator** (atau role admin yang disetel) yang dapat mengeksekusinya.
   - Perintah lengkap: `/ban`, `/unban`, `/kick`, `/timeout`, `/untimeout`, `/warn`, `/warnings`, `/clearwarn`, `/purge`, `/slowmode`, `/lock`, `/unlock`.
   - Mod-logs terintegrasi dengan embed aesthetic Wander Roleplay.

2. **🎫 Sistem Open Ticket Customer Support**
   - Panel open ticket interaktif dengan dropdown pilihan kategori:
     - 🎫 Bantuan Umum & Bug
     - 🚨 Lapor Warga / Player Report
     - 🚗 Tebus Kendaraan / Klaim Asuransi
     - 💎 Donasi & VIP Supporter
     - ❓ Keperluan Lainnya
   - Channel privat otomatis dibuat dengan permissions terkunci (hanya pembuat tiket & staff).
   - Tombol Klaim Tiket (`ticket_claim`), Simpan Transcript (`ticket_transcript`), dan Tutup Tiket (`ticket_close`).
   - Ekspor transcript riwayat chat ke file `.txt` yang otomatis terkirim ke channel arsip log tiket.

3. **📢 Sistem Pengumuman Khusus (/announcement)**
   - Mendukung format **Embed Mewah** maupun **Pesan Teks Polos**.
   - **Bebas Enter / Longkap Bawah**:
     - Mode **Interactive**: Ketik `/announcement interactive`, lalu bot mengaktifkan sesi khusus untuk admin. Admin bebas mengetik pesan panjang di chat dengan enter (`Shift + Enter`), bot otomatis menghapus pesan pemicu agar chat bersih, lalu menampilkan preview interaktif dengan tombol **[✅ Kirim Sekarang]** & **[❌ Batalkan]**.
     - Memiliki sistem **pengaman anti-tabrakan** (session lock per User ID dengan batas waktu 5 menit), sehingga tidak akan bentrok dengan perintah user lain.
     - Mode **Modal**: Membuka formulir pop-up multiline (`TextInputStyle.Paragraph`).
     - Mode **Quick**: Pengumuman cepat 1 baris.

4. **🍯 Fitur Honeypot Anti-Raid & Spammer (Trap Channel)**
   - Terinspirasi dari konsep [RiskyMH/honeypot](https://github.com/RiskyMH/honeypot).
   - Mengatur sebuah channel sebagai perangkap (misal: `#bot-trap` atau `#rules-verification`).
   - Setiap bot spam / token scraper / selfbot yang mengirim pesan di channel jebakan akan **langsung ditindak otomatis** (Ban / Kick / Timeout), riwayat pesan spamnya dibersihkan, dan sistem mengirimkan security alert instan ke channel staff.
   - Server Owner & Administrator otomatis kebal (exempt) dari jebakan ini.

5. **👋 Welcome & Goodbye System**
   - Pesan sambutan warga baru dan perpisahan warga keluar kota dengan embed elegan.
   - Placeholder otomatis: `{user}`, `{username}`, `{tag}`, `{server}`, `{memberCount}`.
   - Fitur **Auto-Role** saat warga baru bergabung (misal: role Warga Baru).
   - Perintah `/welcome test` dan `/goodbye test` untuk melihat preview tampilan.

6. **🎭 Ambil Role Mandiri (Take Role / Self-Roles)**
   - `/takerole notifications`: Tombol notifikasi Pengumuman, Update FiveM, Giveaway, Event.
   - `/takerole gender`: Tombol identitas karakter IC Pria / Wanita.
   - `/takerole custom`: Buat panel role custom dengan tombol sesuai kebutuhan.

7. **🎉 Giveaway System (Tersimpan di SQLite)**
   - `/giveaway start`, `/giveaway end`, `/giveaway reroll`.
   - Menggunakan tombol interaktif `[🎉 Ikut Giveaway (0)]`.
   - Timer tersimpan di SQLite, sehingga giveaway **tetap berjalan dan tidak hilang meskipun bot di-restart di Pterodactyl**.

8. **📊 Polling / Voting Suara Warga**
   - `/poll create` dengan opsi hingga 5 pilihan.
   - Menampilkan persentase suara dan progress bar live (`██████░░░░ 60%`).
   - Mencegah double voting (warga bisa mengganti suaranya kapan saja).

9. **⚙️ Konfigurasi Mudah (config.json + SQLite Settings)**
   - Tersedia file [config.json](file:///d:/diaz%20ngoding/bot-wander/config.json) untuk mengatur nama kota, link connect FiveM, warna embed, default channel & role.
   - Perintah `/setup` & `/settings` untuk memperbarui pengaturan langsung dari Discord tanpa restart!

10. **🎵 Sistem Pemutar Musik (Lavalink v4, Autoplay, 24 Jam Standby)**
    - Terhubung langsung ke dua node Lavalink v4 publik gratis Serenetia (`SSL Port 443` & `Non-SSL Port 80`) dengan sistem failover otomatis.
    - **Autoplay**: Otomatis memutar lagu rekomendasi yang mirip setelah antrean habis.
    - **24/7 Mode**: Bot dapat diatur standby 24 jam nonstop di voice channel tanpa pernah disconnect.
    - **Now Playing Interaktif**: Dilengkapi tombol kontrol visual (Play/Pause, Skip, Stop, Loop, Autoplay, Volume Up/Down, Queue, 24/7).
    - **Smart Search Tier (Spotify -> YouTube Fallback)**: Mengutamakan pencarian di Spotify terlebih dahulu; jika lagu tidak ada di Spotify (misal DJ/Remix/Cover), otomatis beralih mencari di YouTube, YouTube Music, dan SoundCloud tanpa macet.
    - Mendukung pencarian link langsung (Spotify URL, YouTube URL, SoundCloud URL).

---

## 🚀 Panduan Setup & Deploy di Pterodactyl (Bun Egg)

### 1. Persiapan Discord Developer Portal
1. Buka [Discord Developer Portal](https://discord.com/developers/applications).
2. Buat aplikasi baru, lalu masuk ke menu **Bot**.
3. Di bagian **Privileged Gateway Intents**, **WAJIB AKTIFKAN KETIGA INTENT BERIKUT**:
   - ✅ **Presence Intent**
   - ✅ **Server Members Intent** (Penting untuk Welcome, Goodbye, Auto-role)
   - ✅ **Message Content Intent** (Penting untuk Honeypot trap & Pengumuman interaktif)
4. Masuk ke **OAuth2 -> URL Generator**, pilih scope `bot` dan `applications.commands`.
5. Berikan permission `Administrator`, lalu undang bot ke server Discord Wander Roleplay kamu.
6. Salin **Bot Token** dan **Client ID**.

---

### 2. Deploy di Pterodactyl Panel (Bun Egg)
1. Buat Server baru di Pterodactyl dengan memilih **Egg Bun** (atau Node.js 22+).
2. Upload semua file dari folder bot ini ke File Manager Pterodactyl.
3. Buka file `.env` di File Manager Pterodactyl, lalu isi:
   ```env
   DISCORD_TOKEN=masukkan_token_bot_kamu_di_sini
   CLIENT_ID=masukkan_client_id_bot_kamu
   GUILD_ID=masukkan_id_server_discord_wander_rp
   DATABASE_PATH=./data/wander.sqlite
   ```
   *(Tips: Mengisi `GUILD_ID` membuat slash command langsung muncul instan tanpa menunggu cache global Discord).*
4. Pada tab **Startup** di Pterodactyl:
   - File utama `index.ts` sudah tersedia di **root folder (luar)** maupun di dalam `src/index.ts`.
   - **Startup Command** di Pterodactyl dapat menggunakan salah satu dari:
     ```bash
     bun run index.ts
     ```
     atau
     ```bash
     bun run src/index.ts
     ```
     atau cukup:
     ```bash
     bun start
     ```
5. Jalankan console dan klik **Start**! Bot akan otomatis menghubungkan database SQLite, mendaftarkan slash command, dan online.

---

### 3. Menjalankan di Komputer Lokal / VPS

Jika menggunakan **Bun**:
```bash
# Install dependencies
bun install

# Menjalankan bot (bisa dari luar index.ts atau src/index.ts)
bun run index.ts

# Mode development (auto-reload saat file diedit)
bun run dev
```

Jika menggunakan **Node.js (v22+)**:
```bash
npm install
npm run build
npm run node:start
```

---

## 📂 Struktur Direktori Proyek

```
bot-wander/
├── index.ts                 # Entry point di luar (root) untuk kemudahan Pterodactyl Bun Egg
├── config.json              # File konfigurasi utama (mudah diedit tanpa coding)
├── .env                     # Token & ID bot Discord
├── .env.example             # Contoh template environment
├── package.json             # Konfigurasi package & scripts Bun
├── tsconfig.json            # Konfigurasi TypeScript
├── data/
│   └── wander.sqlite        # Database SQLite otomatis (WAL mode)
└── src/
    ├── index.ts             # Entry point bot internal & anti-crash protection
    ├── config.ts            # Loader konfigurasi
    ├── client.ts            # Extended Discord Client
    ├── database/
    │   ├── db.ts            # SQLite adapter native Bun & Node
    │   └── schema.ts        # Tabel & repositori query SQLite
    ├── commands/
    │   ├── admin/           # announcement, honeypot, settings
    │   ├── moderation/      # ban, kick, timeout, warn, purge, lock, dll
    │   ├── tickets/         # ticket panel, claim, transcript, close
    │   ├── roles/           # takerole notifications, gender, custom
    │   ├── welcome/         # welcome setup & test, goodbye
    │   ├── giveaway/        # giveaway start, end, reroll
    │   ├── poll/            # poll create, end
    │   ├── fivem/           # fivem status & setup, suggest, whitelist
    │   └── general/         # ping, help, serverinfo
    ├── events/
    │   ├── ready.ts         # Register slash command & activity status
    │   ├── interactionCreate.ts # Handler slash command, button, modal, dropdown
    │   ├── messageCreate.ts # Honeypot detection, Anti-Invite & announcement session
    │   ├── guildMemberAdd.ts # Welcome message & auto-role
    │   └── guildMemberRemove.ts # Goodbye message
    ├── modules/
    │   ├── ticketManager.ts # Logika pembuatan channel, perms & arsip tiket
    │   ├── giveawayManager.ts # Background scheduler & pemenang undian
    │   ├── announcementSession.ts # Pengaman sesi pengetikan pengumuman
    │   └── logger.ts        # Pengirim audit log moderasi & honeypot alert
    └── utils/
        ├── permissions.ts   # Verifikasi Server Owner & Administrator
        ├── embeds.ts        # Template embed Wander Roleplay
        └── time.ts          # Parser durasi (10m, 1h, 1d)
```

---

## 🛠️ Daftar Perintah Slash Commands

| Perintah | Hak Akses | Deskripsi |
| :--- | :--- | :--- |
| `/ban` | Owner & Admin | Membanned warga dari server secara permanen |
| `/unban` | Owner & Admin | Mencabut ban warga menggunakan User ID |
| `/kick` | Owner & Admin | Mengeluarkan warga dari server |
| `/timeout` | Owner & Admin | Membungkam sementara warga (contoh: `10m`, `1h`, `1d`) |
| `/untimeout` | Owner & Admin | Membatalkan timeout warga |
| `/warn` | Owner & Admin | Memberikan peringatan resmi ke warga (tersimpan di DB) |
| `/warnings` | Owner & Admin | Melihat seluruh riwayat peringatan warga |
| `/clearwarn` | Owner & Admin | Menghapus warn tertentu atau membersihkan semua warn |
| `/purge` | Owner & Admin | Menghapus hingga 100 pesan sekaligus |
| `/slowmode` | Owner & Admin | Mengatur jeda pengiriman pesan channel |
| `/lock` & `/unlock` | Owner & Admin | Mengunci atau membuka channel teks |
| `/announcement interactive` | Owner & Admin | Kirim pengumuman langsung di chat (bisa enter / longkap bawah) |
| `/announcement modal` | Owner & Admin | Formulir pop-up pengumuman multiline |
| `/announcement quick` | Owner & Admin | Kirim pengumuman instan 1 baris |
| `/honeypot setup` | Owner & Admin | Pasang perangkap anti bot raid & spammer |
| `/honeypot status & logs` | Owner & Admin | Cek status & riwayat tangkapan honeypot |
| `/ticket panel` | Owner & Admin | Pasang panel open ticket dengan kategori |
| `/ticket claim & close` | Staff / Admin | Klaim tiket dan tutup tiket dengan transcript otomatis |
| `/takerole` | Owner & Admin | Pasang panel ambil role notifikasi, gender, atau custom |
| `/welcome setup & test` | Owner & Admin | Atur pesan sambutan warga baru & auto role |
| `/goodbye setup & test` | Owner & Admin | Atur pesan perpisahan warga keluar kota |
| `/giveaway start & end` | Owner & Admin | Mulai undian berhadiah dengan tombol join |
| `/poll create & end` | Owner & Admin | Buat voting warga dengan grafik batang real-time |
| `/setup dashboard` | Owner & Admin | Buka panel kontrol visual interaktif (toggle fitur & status) |
| `/setup channel` | Owner & Admin | Atur, ganti, atau hapus channel fungsi bot (Mod/Ticket/Welcome/Honeypot) |
| `/setup role` | Owner & Admin | Atur, ganti, atau hapus wewenang role Admin, Moderator, & Citizen |
| `/setup features` | Owner & Admin | Nyalakan / matikan fitur Anti-Invite, Honeypot, Welcome, Goodbye |
| `/setup reset` | Owner & Admin | Hapus / reset konfigurasi channel, role, atau reset total ke default |
| `/settings` | Owner & Admin | Atur role admin, role mod, channel log secara dinamis |
| `/fivem status & setup` | Semua / Admin | Cek status server FiveM live (pemain aktif, ping, connect) |
| `/suggest kirim & review` | Semua / Admin | Kotak aspirasi warga dengan tombol vote setuju/tidak |
| `/whitelist panel` | Owner & Admin | Formulir pendaftaran karakter IC & verifikasi warga baru |
| `/music play` | Semua Warga | Putar lagu dari Spotify, YouTube, Apple Music, SoundCloud, Deezer, Yandex, Audio File |
| `/music sources` | Semua Warga | Lihat daftar 9+ platform & sumber streaming musik yang didukung |
| `/music stop & skip` | Semua Warga | Hentikan pemutaran musik atau lewati ke lagu berikutnya |
| `/music pause & resume`| Semua Warga | Jeda atau lanjutkan pemutaran musik saat ini |
| `/music queue & nowplaying`| Semua Warga | Lihat daftar antrean lagu & progress bar lagu sekarang |
| `/music autoplay` | Semua Warga | Mode putar otomatis lagu rekomendasi mirip setelah antrean habis |
| `/music 247` | Semua Warga | Mode standby 24 jam bot di voice channel tanpa disconnect |
| `/music volume & loop` | Semua Warga | Sesuaikan volume (1-150%) dan mode pengulangan lagu/antrean |
| `/music shuffle` | Semua Warga | Acak urutan seluruh lagu dalam antrean |
| `/ping` | Semua Warga | Cek latensi bot, RAM, uptime, dan status database |
| `/help` | Semua Warga | Panduan interaktif menu bantuan bot |
| `/serverinfo` | Semua Warga | Informasi kota Wander Roleplay, member, & link connect |

---

### 🎵 Sumber Musik yang Didukung (Supported Sources):
Bot Wander Roleplay mendukung pemutaran dari seluruh sumber berikut via Lavalink v4:
- 🔴 **YouTube** (URL Video, Shorts, Playlist, `ytsearch:`) ✅
- 🟢 **Spotify** (URL Track, Album, Playlist, Artis, `spsearch:`) ✅
- 🍎 **Apple Music** (URL Song, Album, Playlist, `amsearch:`) ✅
- 🟠 **SoundCloud** (URL Track, Sets, `scsearch:`) ✅
- 💙 **Deezer** (URL Track, Album, Playlist, `dzsearch:`) ✅
- 🟡 **Yandex Music** (URL Track, Album, `ymsearch:`) ✅
- 📻 **HTTP Streaming** (Radio online, Icecast, Shoutcast, `.m3u`, `.pls`) ✅
- 📁 **HTTP Audio File** (Direct URL file `.mp3`, `.wav`, `.flac`, `.ogg`, `.m4a`, `.aac`) ✅
- ✨ **And more!** (Twitch stream audio, Bandcamp, Custom web streams) ✅

**🧠 Sistem Prioritas Pencarian Otomatis (Smart Multi-Tier):**
Secara default, bot mencari judul di **Spotify** terlebih dahulu (`spsearch:`). Jika lagu tidak ditemukan di Spotify (misalnya versi cover, remix, atau DJ YouTube), bot secara otomatis dan mulus beralih ke **YouTube** (`ytsearch:`) dan platform lainnya tanpa macet! Anda juga dapat memilih sumber langsung pada opsi `/music play platform:[pilihan]`.

**📻 Sistem Rekomendasi Autoplay Cerdas (Spotify & YouTube Radio Algorithm):**
- **Terlihat di Antrean (`/music queue`)**: Saat Autoplay aktif, lagu rekomendasi berikutnya langsung disiapkan di latar belakang dan dapat dilihat di `/music queue` maupun card *Now Playing*, sehingga Anda tahu lagu apa yang akan diputar selanjutnya.
- **Rekomendasi Genre Sejenis (Bukan Mengulang Lagu)**: Mirip dengan Spotify Radio atau YouTube Music Mix, jika ada yang me-request lagu (contoh: lagu dari *Yung Lean*), bot akan menganalisis genre & artis terkait (seperti cloud rap/sad boys/hip hop alternatif) dan memilih lagu sejenis yang bervariasi.
- **Anti-Pengulangan (History Filter)**: Bot mencatat 50 lagu terakhir yang telah diputar serta menyaring varian judul (remix/slowed/re-upload) agar tidak memutar lagu yang sama lagi.
- **Prioritas Request Warga**: Permintaan lagu manual dari warga melalui `/music play` selalu diprioritaskan sebelum lagu autoplay. Rekomendasi autoplay akan otomatis menyesuaikan diri dengan lagu baru yang diminta warga!

---

*Dikembangkan khusus untuk Wander Roleplay • Kota Impian Kita.*
