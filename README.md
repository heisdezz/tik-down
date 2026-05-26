# TikDown 🚀

A high-performance, feature-rich TikTok video downloader built with **Expo SDK 55**, **React Native**, and **TypeScript**. Designed for speed, reliability, and handling large bulk downloads with ease.

## ✨ Features

- **Prioritized Download Queue**: Managed worker pool with concurrency control (1-5 videos) and priority tiers (High for single downloads, Low for bulk operations).
- **Resilient Downloads**: Automatic exponential backoff for provider rate limits (429 errors) and rehydration recovery for interrupted tasks.
- **Android SAF Support**: Full integration with Storage Access Framework (SAF) for user-selected external folders, including directory reuse and a write-mutex to prevent thread blocking.
- **Hybrid Caching Architecture**:
  - **TanStack React Query**: Manages fetching lifecycle and in-memory cache for profile data.
  - **Zustand + MMKV**: Provides ultra-fast persistent storage for downloads, profiles, and settings.
  - **URL Cache**: 6-hour TTL for resolved CDN URLs to minimize redundant scraping.
- **High-Performance UI**: Uses `@shopify/flash-list` for smooth 1000+ item scrolling and targeted Zustand selectors to prevent unnecessary re-renders during progress updates.
- **Library Validation**: Integrated integrity checks via pull-to-refresh and manual re-check buttons to keep your local library in sync.

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| **Framework** | Expo SDK 55, Expo Router (File-based) |
| **State** | Zustand v5 + TanStack React Query v5 |
| **Persistence** | `react-native-mmkv` (C++ high-performance storage) |
| **Styling** | `twrnc` (Tailwind RN) + Custom Pastel Palette |
| **I/O** | `expo-file-system` (Legacy API) + `axios` |
| **Animations** | `react-native-reanimated` |

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (recommended) or npm
- [Expo Go](https://expo.dev/go) or a Development Build environment

### Installation
1. Clone the repository
   ```bash
   git clone https://github.com/heisdezz/tik-down.git
   cd tik-down
   ```
2. Install dependencies
   ```bash
   bun install
   ```

### Running Locally
- **Android**: `bun run android`
- **iOS**: `bun run ios`
- **Web**: `bun run web`

### Verification
Always verify code integrity before committing:
```bash
bunx tsgo --noEmit
```

## 📖 Documentation
For deeper architectural insights, refer to our specialized guides:
- [Main Agent Guide](./AGENTS.md)
- [Library Implementation](./lib/AGENTS.md)
- [Store Architecture](./src/store/AGENTS.md)

---
*Built with ❤️ for the TikTok community.*
