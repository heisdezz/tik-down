# TikDown

A high-performance TikTok video downloader built with **Expo SDK 55**, **React Native 0.83**, and **TypeScript**. Designed for speed, reliability, and bulk downloads at scale.

## Features

- **Prioritized download queue** — worker pool with concurrency control (1–5 simultaneous downloads), priority tiers (High for single, Low for bulk), and exponential backoff for rate-limit (429) recovery.
- **TikTok authentication** — in-app WebView login portal that captures session cookies for authenticated API access, bypassing public rate limits.
- **Authenticated + unauthenticated API** — automatically uses a session token when available; falls back to unauthenticated requests. Profile data is streamed via NDJSON for fast progressive rendering.
- **Android SAF support** — full Storage Access Framework integration for user-selected external folders, write-mutex to prevent thread contention, and reuse of previously granted URIs.
- **Hybrid caching architecture**:
  - **TanStack React Query** — fetching lifecycle and in-memory cache for profile data.
  - **Zustand + MMKV** — persistent storage for downloads, profiles, settings, and auth state via C++ bindings.
  - **URL cache** — 6-hour TTL on resolved CDN URLs to avoid redundant scraping.
- **High-performance list rendering** — `@shopify/flash-list` for smooth scrolling across 1000+ items; targeted Zustand selectors to prevent re-renders during active progress updates.
- **Library validation** — pull-to-refresh and manual re-check buttons verify local file integrity.
- **Debug log viewer** — in-app bottom sheet showing structured logs with copy-all support.
- **Session details modal** — view stored TikTok session info (username, user ID, timestamps, raw cookies) with one-tap copy.

## Tech Stack

| Layer | Choice |
|---|---|
| **Framework** | Expo SDK 55, Expo Router (file-based) |
| **State** | Zustand v5 + TanStack React Query v5 |
| **Persistence** | `react-native-mmkv` (C++ key-value storage) |
| **Styling** | `twrnc` (Tailwind RN) + custom pastel palette |
| **Networking** | `axios` + native `fetch` (streaming NDJSON) |
| **Animations** | `react-native-reanimated` 4 + `react-native-worklets` |
| **Cookies** | `@preeternal/react-native-cookie-manager` |
| **I/O** | `expo-file-system` (legacy API) |

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/)
- Android device or emulator

### Installation

```bash
git clone https://github.com/heisdezz/tik-down.git
cd tik-down
bun install
```

### Running locally

```bash
bun run android   # Android
bun run ios       # iOS
bun run web       # Web
```

### Type checking

```bash
bunx tsgo --noEmit
```

## Project Structure

```
src/
  app/
    (tabs)/         # Bottom tab screens (home, tiktok, instagram, settings)
    auth/           # TikTok WebView login
    history/        # Per-download detail view
    profile/        # User profile + video grid
  components/       # Shared UI components
  store/            # Zustand stores (auth, downloads, profiles, settings)
lib/                # Core logic (api, download, logger, mmkv, tiktok)
types/              # Shared TypeScript types
```

## Documentation

- [Agent Guide](./AGENTS.md)
- [Lib internals](./lib/AGENTS.md)
- [Store architecture](./src/store/AGENTS.md)
