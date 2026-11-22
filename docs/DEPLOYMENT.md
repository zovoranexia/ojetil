# Panduan Instalasi & Konfigurasi — VPS Ubuntu 26.04 LTS

Panduan ini memasang OJETIL WebApp di satu VPS Ubuntu Server 26.04 LTS untuk produksi:
Next.js berjalan sebagai layanan systemd, PostgreSQL di server yang sama, dan Nginx sebagai
reverse proxy dengan HTTPS dari Let's Encrypt.

```text
Internet ──443/80──▶ Nginx (TLS, reverse proxy)
                        │  X-Forwarded-For, X-Forwarded-Proto, Host
                        ▼
                 Next.js  :3000 (hanya loopback)  (systemd: ojetil.service, user "ojetil")
                        │
                        ▼
                 PostgreSQL 127.0.0.1:5432  (database "ojetil")

/srv/ojetil/
├── releases/<tanggal-jam>/   satu folder per versi yang di-deploy
├── current ──▶ releases/…    symlink ke versi aktif (dipakai systemd)
└── shared/
    ├── .env                  konfigurasi + kunci enkripsi (chmod 600)
    └── storage/uploads/      foto anggota (terenkripsi)
```

> **Konvensi:** perintah dengan `sudo` dijalankan oleh admin server. Ganti `ojetil.tl`,
> `admin@ojetil.tl`, dan nilai contoh lain dengan milik Anda. Docker **tidak** dipakai di
> produksi; `docker-compose.yml` di repo hanya untuk pengembangan lokal.

---

## 1. Prasyarat

| Kebutuhan | Minimum | Disarankan |
| --- | --- | --- |
| CPU | 2 vCPU | 2–4 vCPU |
| RAM | 2 GB **+ swap 2 GB** (build Next.js butuh ±1,5–2 GB) | 4 GB |
| Disk | 20 GB SSD | 40 GB+ (foto anggota, backup) |
| OS | Ubuntu Server 26.04 LTS (64-bit), instalasi baru | |

Siapkan juga:

- **Domain** dengan record DNS `A` (dan `AAAA` jika ada IPv6) untuk `ojetil.tl` dan `www.ojetil.tl` yang mengarah ke IP VPS. Sertifikat HTTPS baru bisa dibuat setelah DNS aktif.
- **Akses SSH** dengan kunci (bukan password).
- **Akses baca ke repository** GitHub `zovoranexia/ojetil` (deploy key, lihat langkah 6).
- VPS harus bisa mengakses internet keluar: `npm`, GitHub, dan **fonts.googleapis.com** (Next.js mengunduh font saat build).

---

## 2. Persiapan server

### 2.1 Update sistem & zona waktu

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y git curl ca-certificates gnupg ufw fail2ban unattended-upgrades
sudo timedatectl set-timezone UTC      # aplikasi menyimpan UTC dan menampilkan waktu Díli sendiri
sudo reboot                            # jika kernel ikut diperbarui
```

Biarkan zona waktu server **UTC**. Aplikasi menyimpan semua waktu dalam UTC dan
mengonversinya ke Asia/Dili (UTC+9) saat menampilkan.

### 2.2 Pengguna admin & SSH

Jika masih login sebagai `root`, buat pengguna admin dan salin kunci SSH-nya:

```bash
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Uji login `ssh deploy@IP-VPS` di terminal **lain**, lalu kunci SSH di
`/etc/ssh/sshd_config.d/99-hardening.conf`:

```text
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
```

```bash
sudo sshd -t && sudo systemctl reload ssh
```

### 2.3 Firewall, pembaruan otomatis, fail2ban

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw enable

sudo dpkg-reconfigure -plow unattended-upgrades   # pilih "Yes"
sudo systemctl enable --now fail2ban               # konfigurasi bawaan sudah melindungi sshd
```

PostgreSQL (5432) dan Next.js (3000) **tidak** dibuka di firewall. PostgreSQL hanya mendengarkan
di `127.0.0.1`; Next.js mendengarkan di semua interface (alasannya di langkah 9), tetapi ditutup
oleh `ufw` dan oleh aturan `IPAddressAllow=localhost` pada unit systemd-nya.

### 2.4 Swap (wajib untuk RAM ≤ 2 GB)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

---

## 3. Node.js 24 LTS

Aplikasi membutuhkan Node.js **≥ 20.18**. CI memakai Node 24 LTS, jadi gunakan Node 24 di server.

Periksa dulu versi bawaan Ubuntu 26.04:

```bash
apt-cache policy nodejs
```

- **Opsi A — paket Ubuntu:** jika versi kandidat **24.x** (atau minimal 22.x), pasang langsung:
  `sudo apt install -y nodejs npm`
- **Opsi B — NodeSource (Node 24):** jika versi bawaan lebih lama. Baca skripnya sebelum menjalankan:

  ```bash
  curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource_setup.sh
  less /tmp/nodesource_setup.sh        # periksa isinya
  sudo bash /tmp/nodesource_setup.sh
  sudo apt install -y nodejs           # npm sudah termasuk
  ```

```bash
node -v   # v24.x
npm -v
```

> Tidak perlu `build-essential`: `@node-rs/argon2` dan `sharp` memakai biner siap pakai.

---

## 4. PostgreSQL

```bash
sudo apt install -y postgresql
psql --version                       # versi bawaan Ubuntu 26.04; aplikasi mendukung PostgreSQL 16+
sudo systemctl enable --now postgresql
```

Buat role dan database. Role `ojetil` menjadi **pemilik** database: migrasi perlu membuat
ekstensi `unaccent` (ekstensi *trusted*, cukup hak pemilik), trigger, dan fungsi.

```bash
DB_PASS="$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)"
# Disimpan di file khusus root agar langkah 7 membacanya persis (tanpa salin-tempel).
sudo install -m 600 -o root -g root /dev/null /root/ojetil-db-pass
printf '%s' "$DB_PASS" | sudo tee /root/ojetil-db-pass > /dev/null

# Aman dijalankan ulang: role/database dibuat jika belum ada, password SELALU diset ulang
# ke nilai di atas — sehingga file /root/ojetil-db-pass dan PostgreSQL selalu sama.
sudo -u postgres psql -v ON_ERROR_STOP=1 -v pass="$DB_PASS" <<'SQL'
SELECT 'CREATE ROLE ojetil LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ojetil')\gexec
ALTER ROLE ojetil WITH LOGIN PASSWORD :'pass';
SELECT 'CREATE DATABASE ojetil OWNER ojetil ENCODING ''UTF8'' TEMPLATE template0'
 WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ojetil')\gexec
SQL
unset DB_PASS
```

> Jika langkah ini dijalankan ulang, password lama tidak berlaku lagi: ulangi juga langkah 7
> (atau perbarui baris `DATABASE_URL` seperti di bagian Pemecahan masalah, error `P1000`).

Secara bawaan PostgreSQL di Ubuntu hanya mendengarkan `localhost`. Pastikan tetap begitu:

```bash
sudo -u postgres psql -tAc "SHOW listen_addresses;"   # harus: localhost
```

---

## 5. Pengguna sistem & folder aplikasi

Aplikasi berjalan sebagai pengguna sistem `ojetil` tanpa shell login:

```bash
sudo adduser --system --group --home /srv/ojetil --shell /usr/sbin/nologin ojetil
sudo install -d -o ojetil -g ojetil -m 750 /srv/ojetil/releases /srv/ojetil/shared
sudo install -d -o ojetil -g ojetil -m 700 /srv/ojetil/shared/storage /srv/ojetil/shared/storage/uploads
```

---

## 6. Akses ke repository (deploy key)

Repository bersifat privat. Buat kunci khusus server dengan akses **hanya-baca**:

```bash
sudo -u ojetil install -d -m 700 /srv/ojetil/.ssh
sudo -u ojetil ssh-keygen -t ed25519 -N "" -C "ojetil-vps-deploy" -f /srv/ojetil/.ssh/id_ed25519
sudo cat /srv/ojetil/.ssh/id_ed25519.pub
```

Tambahkan kunci publik itu di GitHub: **zovoranexia/ojetil → Settings → Deploy keys → Add deploy key**
(jangan centang *Allow write access*). Lalu uji:

```bash
sudo -u ojetil -H ssh -o StrictHostKeyChecking=accept-new -T git@github.com
# "Hi zovoranexia/ojetil! You've successfully authenticated…"
```

---

## 7. Konfigurasi `.env` produksi

File ini menyimpan **kunci enkripsi data pribadi anggota**. Buat sekali, simpan cadangannya,
dan jangan pernah mengubah kuncinya sembarangan.

```bash
DB_PASS="$(sudo cat /root/ojetil-db-pass)"     # dibuat di langkah 4
test -n "$DB_PASS" || { echo "Password DB kosong — jalankan langkah 4 dulu"; exit 1; }
sudo -u ojetil tee /srv/ojetil/shared/.env > /dev/null <<EOF
# URL publik situs (tanpa garis miring di akhir)
APP_URL="https://ojetil.tl"

DATABASE_URL="postgresql://ojetil:${DB_PASS}@localhost:5432/ojetil?schema=public"

# Auth.js — menandatangani/mengenkripsi cookie sesi
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_TRUST_HOST="true"

# Nginx menambahkan IP klien ke X-Forwarded-For → 1 proxy tepercaya.
# Jika ada Cloudflare/load balancer lain di depan Nginx, tambah 1 per lapisan.
TRUSTED_PROXY_HOPS="1"

# Enkripsi data pribadi (AES-256-GCM) dan blind index nomor BI
PII_ENCRYPTION_KEYS="1:$(openssl rand -base64 32)"
PII_ACTIVE_KEY_VERSION="1"
PII_BLIND_INDEX_KEY="$(openssl rand -base64 32)"

# Foto anggota (terenkripsi), di luar folder rilis
UPLOAD_DIR="/srv/ojetil/shared/storage/uploads"
MAX_PROFILE_PHOTO_BYTES="1048576"
EOF
sudo chmod 600 /srv/ojetil/shared/.env
unset DB_PASS
```

Uji koneksi database **sebelum** lanjut ke langkah 8:

```bash
sudo -u ojetil -H bash -c 'set -a; . /srv/ojetil/shared/.env; psql "${DATABASE_URL%%\?*}" -tAc "SELECT current_user"'
# harus mencetak: ojetil
```

> ⚠️ **Simpan salinan `.env` sekarang** (minimal `PII_ENCRYPTION_KEYS` dan `PII_BLIND_INDEX_KEY`)
> di password manager organisasi atau media offline. **Tanpa kunci ini, data pribadi anggota
> di database dan di backup tidak dapat dibuka selamanya.**

Catatan:
- `NODE_ENV` tidak ditulis di `.env`; nilainya diatur oleh systemd (langkah 9).
- Variabel `POSTGRES_*` dan `SEED_DEMO_PASSWORD` dari `.env.example` hanya untuk pengembangan dan tidak diperlukan di sini.
- Aplikasi memvalidasi semua nilai ini saat start. Jika ada yang salah, layanan gagal dengan pesan `Invalid server environment` di log.

---

## 8. Rilis pertama: unduh kode, migrasi, build

```bash
sudo -u ojetil -H bash -s <<'BASH'
set -euo pipefail
cd /srv/ojetil
REL="releases/$(date -u +%Y%m%d-%H%M%S)"
git clone --depth 1 --branch main git@github.com:zovoranexia/ojetil.git "$REL"
cd "$REL"
ln -s /srv/ojetil/shared/.env .env
npm ci                       # menjalankan juga "prisma generate"
npx prisma migrate deploy    # membuat semua tabel, trigger audit, dan ekstensi unaccent
npm run build                # ±2–5 menit; butuh akses ke fonts.googleapis.com
ln -sfn "/srv/ojetil/$REL" /srv/ojetil/current
echo "Rilis aktif: $(readlink /srv/ojetil/current)"
BASH
```

Jika `npm run build` gagal dengan error `next/font` atau *Failed to fetch … from Google Fonts*,
itu biasanya gangguan jaringan sesaat: jalankan ulang perintah build.

Jika blok ini berhenti di tengah (mis. error `P1000` saat migrasi), perbaiki penyebabnya, hapus
folder rilis yang gagal (`sudo rm -rf /srv/ojetil/releases/<tanggal-jam>` — yang **bukan** target
symlink `current`), lalu jalankan ulang seluruh blok.

---

## 9. Layanan systemd

Buat `/etc/systemd/system/ojetil.service`:

```ini
[Unit]
Description=OJETIL WebApp (Next.js)
After=network-online.target postgresql.service
Wants=network-online.target postgresql.service

[Service]
Type=simple
User=ojetil
Group=ojetil
WorkingDirectory=/srv/ojetil/current
Environment=NODE_ENV=production
# PENTING: jangan tambahkan `--hostname 127.0.0.1`. Next.js 15 membangun URL internalnya
# dengan nama "localhost"; bila alamat bind berbeda, rewrite bahasa (/ → /tet) dianggap
# proxy eksternal dan halaman publik jadi 500 di belakang Nginx (lihat Troubleshooting).
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start --port 3000
Restart=on-failure
RestartSec=5
TimeoutStopSec=20

# Port 3000 terikat ke semua interface, jadi koneksi dibatasi di level kernel: layanan ini
# hanya boleh berkomunikasi lewat loopback. Semua lalu lintas WAJIB lewat Nginx (penting
# agar IP klien di X-Forwarded-For dapat dipercaya untuk rate limit dan audit log).
# Catatan: ini juga memblokir koneksi KELUAR. Aplikasi saat ini tidak membutuhkannya
# (database di localhost). Jika kelak menambah fitur seperti email SMTP, longgarkan aturan ini.
IPAddressAllow=localhost
IPAddressDeny=any

# Pengamanan
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
ReadWritePaths=/srv/ojetil/shared/storage /srv/ojetil/releases

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ojetil
sudo systemctl status ojetil --no-pager
curl -sI http://127.0.0.1:3000/ | head -1      # HTTP/1.1 200 OK
```

> Jalankan **satu instance saja**. Rate limit (login, pendaftaran, cek status) disimpan di
> memori proses; beberapa instance (mis. PM2 cluster) masing-masing punya hitungan sendiri.

Log aplikasi: `sudo journalctl -u ojetil -f`

---

## 10. Nginx sebagai reverse proxy

```bash
sudo apt install -y nginx
sudo ufw allow 'Nginx Full'
```

Buat `/etc/nginx/sites-available/ojetil`:

```nginx
upstream ojetil_app {
    server 127.0.0.1:3000;
    keepalive 16;
}

server {
    listen 80;
    listen [::]:80;
    server_name ojetil.tl www.ojetil.tl;

    # Foto profil maks. 1 MB + data formulir; aplikasi sendiri menolak > 1,4 MB.
    client_max_body_size 2m;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml text/plain;

    location / {
        proxy_pass http://ojetil_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Nginx MENAMBAHKAN IP klien di ujung kanan → TRUSTED_PROXY_HOPS="1" di .env
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ojetil /etc/nginx/sites-enabled/ojetil
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Uji dari komputer Anda: `http://ojetil.tl` harus menampilkan beranda dalam bahasa Tetun.

---

## 11. HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ojetil.tl -d www.ojetil.tl --redirect -m admin@ojetil.tl --agree-tos --no-eff-email
sudo certbot renew --dry-run          # pastikan perpanjangan otomatis berjalan
```

Certbot menambahkan blok `listen 443 ssl` dan pengalihan HTTP ke HTTPS. Setelah HTTPS stabil,
aktifkan HSTS dengan menambahkan baris berikut di blok `server` 443:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

Cookie sesi admin otomatis memakai atribut `Secure` (prefix `__Secure-`) karena situs diakses lewat HTTPS.

---

## 12. Inisialisasi pertama

### 12.1 Buat Super Admin pertama

Database produksi kosong; akun demo dari seed **tidak** dipakai di produksi.

```bash
cd /srv/ojetil/current
sudo -u ojetil -H npm run admin:create -- --email admin@ojetil.tl --name "Nama Lengkap Admin"
```

Perintah ini mencetak **password sementara sekali saja**. Buka `https://ojetil.tl/admin/login`,
masuk, lalu Anda langsung diminta membuat password pribadi. Pembuatan akun ini tercatat di audit log.

### 12.2 (Opsional) Muat konten institusional

Muat profil lembaga dan timeline sejarah dalam 4 bahasa sebagai **DRAFT**. Mode ini tidak membuat
akun, berita, event, atau data anggota demo, dan tidak pernah menimpa baris yang sudah ada.

```bash
cd /srv/ojetil/current
sudo -u ojetil -H env SEED_SCOPE=content npm run db:seed
```

Tinjau teksnya bersama Sekretariat dan sejarawan OJETIL di **/admin/profil** dan
**/admin/linimasa**, lalu ubah status menjadi *Published*.

### 12.3 Lengkapi lewat backoffice

1. **Users & roles:** buat akun Verifier, Editor, dan Viewer. Setiap akun baru mendapat password sementara yang wajib diganti saat login pertama.
2. **Leadership:** isi Direksi Nasional dan koordinator munisipal.
3. Perbarui **email dan telepon kontak** di `src/config/site.ts`; perubahan ini perlu deploy ulang (langkah 14).
4. Uji alur publik: daftar ke sebuah event, isi wizard pendaftaran anggota, lalu cek status dengan kode dan tanggal lahir.

---

## 13. Backup & pemulihan

Yang perlu dibackup: **(1)** database, **(2)** folder foto `shared/storage/uploads`,
**(3)** file `.env` (kunci enkripsi). Simpan (3) **terpisah** dari (1) dan (2), misalnya di
password manager, agar pencuri backup tidak sekaligus memegang kuncinya.

Buat `/usr/local/sbin/ojetil-backup`:

```bash
#!/usr/bin/env bash
set -euo pipefail
DEST=/var/backups/ojetil
STAMP=$(date -u +%Y%m%d-%H%M%S)
install -d -m 700 "$DEST"
sudo -u postgres pg_dump --format=custom --dbname=ojetil > "$DEST/db-$STAMP.dump"
tar -C /srv/ojetil/shared -czf "$DEST/uploads-$STAMP.tar.gz" storage
find "$DEST" -type f -mtime +14 -delete      # simpan 14 hari
```

```bash
sudo chmod 700 /usr/local/sbin/ojetil-backup
sudo /usr/local/sbin/ojetil-backup && sudo ls -lh /var/backups/ojetil
echo '30 2 * * * root /usr/local/sbin/ojetil-backup' | sudo tee /etc/cron.d/ojetil-backup
```

Salin `/var/backups/ojetil` ke lokasi **di luar VPS** secara rutin (misalnya `rsync`/`rclone`
ke penyimpanan lain). Backup yang hanya ada di server yang sama tidak menolong jika server hilang.

**Pemulihan** (uji minimal sekali sebelum go-live):

```bash
sudo systemctl stop ojetil
sudo -u postgres pg_restore --clean --if-exists --no-owner --role=ojetil --dbname=ojetil /var/backups/ojetil/db-YYYYMMDD-HHMMSS.dump
sudo tar -C /srv/ojetil/shared -xzf /var/backups/ojetil/uploads-YYYYMMDD-HHMMSS.tar.gz
sudo chown -R ojetil:ojetil /srv/ojetil/shared/storage
sudo systemctl start ojetil
```

Pemulihan hanya berhasil dengan **`.env` yang sama** (kunci PII yang sama).

---

## 14. Memperbarui aplikasi (deploy versi baru)

Setiap versi di-build di folder rilis baru, jadi situs tetap melayani versi lama selama build.
Setelah itu symlink dipindah dan layanan di-restart (beberapa detik).

Buat `/srv/ojetil/deploy.sh` (milik `ojetil`, `chmod 750`):

```bash
#!/usr/bin/env bash
# Jalankan sebagai: sudo -u ojetil -H /srv/ojetil/deploy.sh   (lalu restart, lihat di bawah)
set -euo pipefail
cd /srv/ojetil
REL="releases/$(date -u +%Y%m%d-%H%M%S)"
git clone --depth 1 --branch main git@github.com:zovoranexia/ojetil.git "$REL"
cd "$REL"
ln -s /srv/ojetil/shared/.env .env
npm ci
npx prisma migrate deploy
npm run build || npm run build          # satu kali ulang untuk gangguan unduhan font
ln -sfn "/srv/ojetil/$REL" /srv/ojetil/current
# simpan 5 rilis terakhir
ls -1dt /srv/ojetil/releases/* | tail -n +6 | xargs -r rm -rf
echo "Siap: $(readlink /srv/ojetil/current) — jalankan: sudo systemctl restart ojetil"
```

```bash
sudo -u ojetil -H /srv/ojetil/deploy.sh && sudo systemctl restart ojetil
sudo journalctl -u ojetil -n 30 --no-pager
```

**Rollback ke rilis sebelumnya:**

```bash
ls -1dt /srv/ojetil/releases/*                       # pilih folder sebelumnya
sudo -u ojetil ln -sfn /srv/ojetil/releases/<folder-sebelumnya> /srv/ojetil/current
sudo systemctl restart ojetil
```

> Migrasi database bersifat maju saja. Rollback kode aman selama migrasi baru hanya *menambah*
> (kolom, tabel, nilai enum). Jika sebuah rilis berisi migrasi yang mengubah atau menghapus data,
> buat backup dulu (langkah 13) sebelum deploy.

---

## 15. Operasional

| Tugas | Perintah |
| --- | --- |
| Status layanan | `sudo systemctl status ojetil` |
| Log langsung | `sudo journalctl -u ojetil -f` |
| Restart (juga mereset rate limit di memori) | `sudo systemctl restart ojetil` |
| Log Nginx | `sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log` |
| Status migrasi | `cd /srv/ojetil/current && sudo -u ojetil -H npx prisma migrate status` |
| Masuk ke database | `sudo -u postgres psql ojetil` |

**Rotasi kunci PII** (misalnya jika kunci diduga bocor):

1. Backup database dan `.env`.
2. Tambahkan kunci baru di `.env`: `PII_ENCRYPTION_KEYS="1:<lama>,2:<baru>"`, lalu `PII_ACTIVE_KEY_VERSION="2"`.
3. `sudo systemctl restart ojetil`. Data baru memakai kunci 2, data lama tetap terbaca dengan kunci 1. **Jangan hapus kunci 1.**

Jangan pernah mengubah `PII_BLIND_INDEX_KEY`: deteksi duplikat nomor BI akan rusak.

**Audit log** bersifat append-only di level database: tidak bisa diubah atau dihapus, termasuk oleh admin.
Akun staf tidak pernah dihapus, hanya dinonaktifkan.

---

## 16. Checklist sebelum go-live

- [ ] DNS mengarah ke VPS; HTTPS aktif dan `certbot renew --dry-run` berhasil.
- [ ] `ufw status` hanya membuka SSH dan Nginx; PostgreSQL dan port 3000 tidak bisa diakses dari luar (uji dari komputer lain: `curl -m 5 http://<IP-VPS>:3000/` harus gagal/timeout).
- [ ] Lewat domain, `/` dan `/notisia` membalas 200 (bukan 500), dan `/admin` mengarahkan ke `/admin/login` di domain yang sama.
- [ ] Login SSH dengan password dan login `root` dimatikan.
- [ ] Salinan `.env` (kunci PII) tersimpan aman **di luar** server.
- [ ] Backup harian berjalan, tersalin ke luar VPS, dan **pemulihan sudah diuji**.
- [ ] Super Admin pertama sudah login dan mengganti password sementaranya.
- [ ] Teks profil dan timeline sudah ditinjau Sekretariat/sejarawan, dan teks Tetun sudah diperiksa penutur asli.
- [ ] Email dan telepon kontak di `src/config/site.ts` sudah benar.
- [ ] Uji akhir: pendaftaran event, wizard anggota (dengan foto), cek status, dan login setiap peran.

---

## 17. Pemecahan masalah

| Gejala | Penyebab umum | Solusi |
| --- | --- | --- |
| Beranda dan halaman tanpa prefiks bahasa (`/`, `/notisia`) `500`, sedangkan `/pt/...` normal; log berisi `Failed to proxy https://localhost:3000/tet … EPROTO` | Next.js dijalankan dengan `--hostname 127.0.0.1` | Hapus `--hostname` dari `ExecStart` (lihat langkah 9), `daemon-reload`, restart |
| `502 Bad Gateway` | Layanan Next.js mati | `sudo systemctl status ojetil`, lalu `journalctl -u ojetil -n 50` |
| Layanan gagal start: `Invalid server environment` | Nilai `.env` salah atau hilang | Perbaiki variabel yang disebut di log, lalu restart |
| Layanan gagal start: `PII_… must be a base64-encoded 32-byte key` | Kunci terpotong atau salah tempel | Pastikan nilainya utuh 44 karakter base64 |
| `P1000: Authentication failed … credentials for ojetil are not valid` | Password di `DATABASE_URL` berbeda dengan password role `ojetil` (mis. langkah 4 dijalankan dua kali, salah tempel, atau placeholder belum diganti) | Set ulang keduanya sekaligus — lihat perintah di bawah tabel |
| `P1001: Can't reach database server` | PostgreSQL mati atau `DATABASE_URL` salah | `sudo systemctl status postgresql`; cek user, password, port |
| Migrasi gagal: `permission denied to create extension "unaccent"` | Role `ojetil` bukan pemilik database | `sudo -u postgres psql -c 'ALTER DATABASE ojetil OWNER TO ojetil;'` |
| Login admin kembali ke halaman login terus | Situs diakses lewat HTTP atau header proxy hilang | Gunakan HTTPS; pastikan `X-Forwarded-Proto` dan `Host` diteruskan Nginx |
| Upload foto gagal `413` | `client_max_body_size` Nginx terlalu kecil | Set `2m` seperti contoh |
| Semua pengunjung terkena rate limit bersamaan | IP klien terbaca sebagai IP proxy | Periksa `TRUSTED_PROXY_HOPS` sesuai jumlah proxy di depan aplikasi |
| Build gagal di `next/font` | Gangguan unduhan Google Fonts | Ulangi `npm run build`; pastikan akses keluar ke `fonts.googleapis.com` |
| Foto anggota tidak tampil di backoffice (404) | File hilang dari `uploads` atau kunci PII berubah | Pulihkan folder uploads dari backup; gunakan `.env` asli |
| Build berhenti karena kehabisan memori (`Killed`) | RAM kurang | Aktifkan swap (langkah 2.4) |

**Memperbaiki `P1000` (password database tidak cocok).** Perintah ini membuat password baru,
memasangnya di PostgreSQL dan di `.env` sekaligus, lalu menguji koneksinya:

```bash
DB_PASS="$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)"
# SQL lewat stdin (bukan -c): psql hanya mengganti variabel :'pass' pada input stdin/file.
# Rantai && memastikan .env hanya diubah jika ALTER ROLE berhasil.
echo "ALTER ROLE ojetil WITH LOGIN PASSWORD :'pass';" \
  | sudo -u postgres psql -v ON_ERROR_STOP=1 -v pass="$DB_PASS" \
  && printf '%s' "$DB_PASS" | sudo tee /root/ojetil-db-pass > /dev/null \
  && sudo chmod 600 /root/ojetil-db-pass \
  && sudo sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"postgresql://ojetil:${DB_PASS}@localhost:5432/ojetil?schema=public\"|" /srv/ojetil/shared/.env \
  && sudo chown ojetil:ojetil /srv/ojetil/shared/.env && sudo chmod 600 /srv/ojetil/shared/.env \
  && echo "Password database diperbarui di PostgreSQL dan .env"
unset DB_PASS
sudo -u ojetil -H bash -c 'set -a; . /srv/ojetil/shared/.env; psql "${DATABASE_URL%%\?*}" -tAc "SELECT current_user"'   # → ojetil
```

Jika pesan errornya `role "ojetil" does not exist`, jalankan ulang seluruh blok di langkah 4, lalu
perintah `sed` dan uji koneksi di atas dengan `DB_PASS="$(sudo cat /root/ojetil-db-pass)"`.
Jika layanan sudah berjalan, `sudo systemctl restart ojetil` setelahnya.

**Peringatan `npm warn install-scripts … @swc/core … @parcel/watcher`** saat `npm ci` aman
diabaikan: kedua paket itu opsional (punya binary siap pakai). Skrip yang dibutuhkan
(Prisma, esbuild) sudah diizinkan lewat `allowScripts` di `package.json`.
