# PRD: Us - Couple App (Web + PWA)

## Overview
"Us" is a private couple app that combines multiple small features into one shared space. It focuses on mobile-first web app with PWA support, deployable to Vercel, using Firebase (Firestore + Storage) as backend.

## Goals
- Create a simple private room for two people to share memories, wishlist, dates, locations, quiz, and expenses
- Mobile-first UX that feels like a native app when installed
- Fast to iterate and test (web-first, shareable via link)
- Minimal auth friction (private room code/invite)
- Clean, aesthetic UI using Tailwind + shadcn/ui

## Target Users
Couples who want a private digital space for their shared moments and planning.

## Features

| Feature | Priority | Description |
|---|---|---|
| Room (Create/Join) | P0 | Private room system. Generate room code, share invite, join with code. Room-scoped data. |
| Our Story (Timeline) | P0 | Chronological posts with photo, caption, date. Like a digital album. |
| Shared Wishlist | P0 | Add items with price/link/notes. Mark as bought/reserved to avoid double purchase. |
| Our Expenses | P0 | Split bills. Record payer, amount, participants, notes. Track simple balances. |
| Date Vault | P1 | Save date ideas, generate random ideas, mark done, favorites. |
| Memory Map | P1 | Pin locations with photos/notes (first date, jadian, cafe, travel). Built with OpenStreetMap (OSM) & Leaflet (CartoDB tiles) for zero-cost, aesthetic map rendering & GPS pinning. |
| Know Us (Couple Quiz) | P1 | Create custom questions, answer alternately, show fun scores. |
| More (Menu) | P1 | Group P1/P2 features + settings/room info. |

## MVP Scope
Focus on P0 first: Room + Our Story + Shared Wishlist + Our Expenses.

## Tech Stack

| Tech | Purpose |
|---|---|
| Next.js 15 (App Router) | Framework |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling (mobile-first) |
| shadcn/ui (Base UI/Nova preset) | UI components |
| Firebase (Firestore, Storage) | Data + media |
| next-pwa | PWA installability |
| Zustand | Client state |
| date-fns | Date utils |
| lucide-react | Icons |
| sonner | Toasts |
| clsx + tailwind-merge + class-variance-authority | Utils |
| Leaflet + OpenStreetMap (OSM) | Interactive map & memory pins (CartoDB tiles, free/no API key) |

## Architecture

### Routes
- `(auth)/` - create/join room
- `(tabs)/` - bottom nav: timeline, wishlist, dates, map, more
- `app/api/` - route handlers if needed for room validation/invite
- `features/` - feature modules (story, wishlist, expenses, dates, map, quiz, room)

### Data Model (Firestore - room scoped)

Collections under `rooms/{roomId}/`:
- `posts` (story) - {id, author?, content, images[], createdAt, date}
- `wishlist` - {id, title, price?, url?, notes?, boughtBy?, boughtAt?, createdAt}
- `expenses` - {id, title, amount, payer, participants[], paid?, notes?, createdAt}
- `dates` - {id, idea, location?, budget?, done?, favorite?, createdAt}
- `pins` (map) - {id, lat, lng, title, category?, caption?, images[], date?, createdAt}
- `quiz/questions` - {id, question, createdAt}
- `quiz/answers` - {id, questionId, user?, answer, createdAt}
- `members` - {id, name?, joinedAt}

Room doc: `rooms/{roomId}` - {id, code, createdAt, createdBy?}

## UI/UX
- Mobile-first (primary 375-430px), responsive
- Bottom nav: Timeline, Wishlist, Dates, Map, More
- PWA: standalone, theme color, manifest
- Touch-friendly (min 44x44px)
- Clean, minimal, couple-y aesthetic

## Deployment
- Vercel (auto deploy from Git)
- Firebase for data/storage (rules room-scoped)

## Security (basic)
- Room-based access: only users with valid roomId/code context
- Firestore/Storage rules to restrict read/write to room members (to be refined)
- Avoid exposing sensitive logic client-side

## Progress

### Done
- [x] Next.js 15 initialized (App Router, TS, Tailwind v4, src/, import alias @/*)
- [x] Dependencies installed (firebase, zustand, sonner, date-fns, lucide-react, next-pwa, clsx, tailwind-merge, cva)
- [x] next-pwa types present (@types/next-pwa)
- [x] Firebase CLI logged in (elianafriliana9@gmail.com)
- [x] Basic project structure created

### In Progress
- [ ] Setup next-pwa (next.config, manifest.json, PWA meta)
- [ ] Setup shadcn/ui (components.json + base components)
- [ ] Setup Firebase client config (.env.local)
- [ ] Create folder structure (app routes, features, lib, stores, types, hooks)
- [ ] Build Room (create/join) UI + logic
- [ ] Build bottom nav + (tabs) layout (mobile-first)
- [ ] Build Our Story (timeline + create post)
- [ ] Build Shared Wishlist
- [ ] Build Our Expenses
- [ ] Add PWA install prompt

### Pending
- [ ] Date Vault
- [ ] Memory Map (basic)
- [ ] Know Us (quiz)
- [ ] Firestore/Storage rules (room-based)
- [ ] Test on mobile (PWA install)

## Next Steps
1. Finish PWA config + shadcn/ui setup
2. Create .env.local with Firebase config (manual)
3. Implement Room flow
4. Implement P0 features with room scoping
5. Deploy to Vercel
