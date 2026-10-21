# Progress: Us App

Last updated: 2026-10-21

## Completed
- [x] Next.js project initialized with App Router, TypeScript, Tailwind v4, src/ directory, import alias @/*
- [x] Dependencies installed: firebase, zustand, sonner, date-fns, lucide-react, next-pwa, clsx, tailwind-merge, class-variance-authority
- [x] PRD.md created with full spec (including Leaflet/OSM Memory Map)
- [x] Firebase Project `us-app-ae6be` created with Web App `Us Couple Web` (`kanvaskita26@gmail.com`)
- [x] Cloud Firestore `(default)` database initialized in `asia-southeast2` (Jakarta)
- [x] Cloud Firestore rules deployed (`rooms/{roomId}` scoped)
- [x] Firebase Storage enabled and rules configured
- [x] Client environment configured (`.env.local` & `.env.example`)
- [x] Firebase SDK wrappers created (`src/lib/firebase/config.ts`, `firestore.ts`, `storage.ts`)
- [x] next-pwa + next.config.ts configured and tested with `npm run build`

- [x] Base UI components created (Button, Input, Card, Badge)
- [x] Mobile-first layout, PWA metadata, and safe-area utilities
- [x] Room feature (Create & Join flow with 6-char code & invite link)
- [x] Zustand persisted room store with hydration handling
- [x] Real-time room listener with partner connection detection
- [x] TopHeader with room code sharing & copy button
- [x] Mobile Bottom Navigation with 5 tabs (`/story`, `/wishlist`, `/expenses`, `/map`, `/more`)
- [x] UI base design system implemented (Plus Jakarta Sans, exact warm palette, floating bottom nav, card shadows)
- [x] Our Story (Timeline) feature built with Firebase Storage photo uploads, filter chips, reaction likes, and micro-interactions
- [x] Shared Wishlist feature built with target price, savings progress tracking, quick adjust progress modal (+Rp 50k, 100k, 500k), and photo uploads
- [x] Header subtitle made dynamic per active tab
- [x] ESLint & Turbopack build 100% clean and passing
- [x] Mood Check-in Harian (ritual harian): kartu mood di tab Story, picker sheet 6 mood (🥰 Bucin, 😄 Bahagia, 🙂 Oke, 😴 Capek, 😔 Sedih, 😤 Berat), realtime via `onSnapshot` di `rooms/{roomId}/moods/{userId}_{yyyy-mm-dd}`, streak beruntun + strip 7 hari, notifikasi animasi saat mood pasangan berubah, state solo ditangani
- [x] Lint dibersihkan: `no-explicit-any` di `removeUndefinedFields`, `set-state-in-effect` di `adjust-progress-modal` (fix via `key` remount), unused var `daysTogether` di `top-header`

## Current State
Fitur Room, Our Story, Shared Wishlist, Our Expenses, Galeri, Memory Map, Presence, Heart Nudge, dan Mood Check-in Harian selesai. Next: Date Vault & Know Us Quiz (masih P1 di PRD).

## Backlog Ide Fitur (usulan 2026-10-21)
| # | Fitur | Kenapa berarti | Modal |
|---|---|---|---|
| 1 | Kenangan Hari Ini | Resurface post/pin dari tanggal yang sama tahun lalu (field `date` sudah ada) | S |
| 2 | Mood Check-in Harian | Ritual harian + streak — **sudah selesai 2026-10-21** | S |
| 3 | Agenda / Rencana Kita | Satukan target date wishlist, anniversary, dan rencana dalam satu layar "ke depan" | M |
| 4 | Kita dalam Angka | Rekap: foto, bulan bersama, kota dikunjungi, pengeluaran, wishlist selesai | M |
| 5 | Dia Sedang di Sini | Nyalakan `locationService.ts` (sudah ada tapi belum dipakai) + ETA via OSRM | M |
| 6 | Weekly Pulse | 3 pertanyaan mingguan, jawab private lalu dibuka bareng | S |
| 7 | Budget per Kategori | Batas bulanan + proyeksi akhir bulan di Expenses | M |
| 8 | Date Vault + Know Us Quiz | Keduanya P1 di PRD tapi belum ada sama sekali | M |
| 9 | Push Notification (FCM) | Notifikasi beneran; sekarang nudge cuma jalan saat app kebuka | L |
| 10 | Buku Rahasia | Catatan terenkripsi client-side untuk hal sangat pribadi | L |
| 11 | Cetak Album | Export PDF foto + caption (cukup CSS print) | S |

### Catatan teknis (penting)
- `firestore.rules` masih `allow read, write: if true` untuk seluruh `rooms/{roomId}/**` → belum ada verifikasi identitas, siapa pun yang punya roomId bisa baca/tulis semua data. Perlu Firebase Anonymous Auth + rules ketat sebelum dipakai luas.
- Semua media (foto & voice note) disimpan sebagai data-URL base64 di dalam dokumen Firestore, bukan Firebase Storage (`storage.rules` ada tapi tidak terpakai) → doc limit 1MB, Galeri dipaksa limit 60, dan setiap load Story menarik seluruh base64. Migrasi ke Storage asli sangat disarankan.
- `locationService.ts` (`updatePartnerLocation` / `subscribeToCoupleLocations`) belum dipakai komponen mana pun — fitur mati yang tinggal dinyalakan.

## Step-by-Step Plan

### Phase 3: P0 Features
1. [x] Our Story (Timeline + Post creation + photo upload to Storage + days together counter)
2. [x] Shared Wishlist (List + Add + Target Cost + Adjust Progress + Photo/Link)
3. [x] Memory Map with OpenStreetMap / Leaflet (CartoDB tiles, custom heart pins, real-time sync, photo upload, category filter, GPS locate)
4. [x] Our Expenses (Add expense + Calculate who owes whom)

### Phase 4: P1 Features + PWA Polish + Deploy
5. [x] Mood Check-in Harian (ritual harian di tab Story)
6. [ ] Date Vault & Know Us Quiz
7. [ ] PWA install prompt component
8. [ ] Deploy to Vercel

## Files to create next
- src/types/date.ts, src/types/quiz.ts
- src/lib/services/dateService.ts, src/lib/services/quizService.ts
- src/app/(tabs)/dates/page.tsx (Date Vault)
- src/app/(tabs)/quiz/page.tsx (Know Us) — atau taruh di menu "More"
- src/components/date/*, src/components/quiz/*

## Known Issues/Notes
- shadcn init CLI interactive; will configure via components.json manually if needed
- Firebase project not yet created via CLI (login ok). Need to create project in Firebase Console or CLI; will proceed with manual config first.
Saat ini firestore.rules dan storage.rules diatur terbuka (allow read, write: if true) untuk dokumen di dalam rooms/{roomId} agar mudah dites berdua tanpa login email/password.
      • Ini sudah sangat cukup dan aman untuk dipakai berdua secara privat dengan kode room unik. Jika nanti ingin dibuka untuk ribuan pengguna umum, bisa ditambahkan autentikasi anonim Firebase.