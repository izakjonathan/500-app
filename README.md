# Adventure Roulette

A production-ready mobile-first Next.js app for spontaneous nearby adventures.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- Route Handler API layer
- PWA manifest + custom service worker
- iOS viewport/safe-area handling

## Commands

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

## Vercel

Use the default Next.js settings:

- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave blank/default

## What changed in this build

- Added cinematic suspense/reveal engine.
- Added staged roulette copy per mode.
- Added polished result reveal with shine pass and smoother Framer Motion transitions.
- Added lightweight haptic feedback where supported.
- Added fallback badge for stale/fallback adventures.
- Added client-only app shell wrapper for safer mobile/PWA rendering.
- Updated to Next.js 16.2.6 with React 19.2.3 and exact pinned dependencies.
- Verified `npm run typecheck` and `npm run build` successfully.
