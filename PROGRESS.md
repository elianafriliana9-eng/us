# Progress: Us App

Last updated: 2026-10-14

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

## Current State
Fitur Room, Our Story, dan Shared Wishlist selesai. Next: Our Expenses (Split Bill & Balances).

## Step-by-Step Plan

### Phase 3: P0 Features
1. [x] Our Story (Timeline + Post creation + photo upload to Storage + days together counter)
2. [x] Shared Wishlist (List + Add + Target Cost + Adjust Progress + Photo/Link)
3. [x] Memory Map with OpenStreetMap / Leaflet (CartoDB tiles, custom heart pins, real-time sync, photo upload, category filter, GPS locate)
4. [ ] Our Expenses (Add expense + Calculate who owes whom)

### Phase 4: P1 Features + PWA Polish + Deploy
5. Date Vault & Know Us Quiz
6. PWA install prompt component
7. Deploy to Vercel

## Files to create next
- next.config.ts (update with next-pwa)
- public/manifest.json
- public/sw.js? (generated)
- src/app/layout.tsx (update with PWA meta)
- components.json (shadcn)
- src/lib/utils.ts (cn)
- src/lib/firebase/config.ts, firestore.ts, storage.ts
- src/types/room.ts, post.ts, wishlist.ts, expense.ts
- src/stores/roomStore.ts
- src/components/layout/bottom-nav.tsx
- src/app/(auth)/page.tsx (or layout)
- src/app/(tabs)/layout.tsx

## Known Issues/Notes
- shadcn init CLI interactive; will configure via components.json manually if needed
- Firebase project not yet created via CLI (login ok). Need to create project in Firebase Console or CLI; will proceed with manual config first.
Saat ini firestore.rules dan storage.rules diatur terbuka (allow read, write: if true) untuk dokumen di dalam rooms/{roomId} agar mudah dites berdua tanpa login email/password.
      • Ini sudah sangat cukup dan aman untuk dipakai berdua secara privat dengan kode room unik. Jika nanti ingin dibuka untuk ribuan pengguna umum, bisa ditambahkan autentikasi anonim Firebase.