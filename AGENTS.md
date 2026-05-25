# tik-down — Agent Guide

TikTok video downloader built with Expo SDK 55 / React Native. Targets Android (primary) and iOS.

## Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 55, expo-router (file-based routing) |
| Language | TypeScript (strict) |
| State | Zustand v5 + `persist` middleware |
| Caching | TanStack React Query v5 |
| Persistence| `react-native-mmkv` (C++ high-performance storage) |
| Styling | twrnc (Tailwind RN) + custom pastel palette |
| HTTP | axios (API calls), expo-file-system (file downloads) |
| Icons | `@expo/vector-icons` Ionicons — **not** expo-symbols (iOS-only) |
| Images | `expo-image` (high-performance caching and transitions) |
| Lists | `@shopify/flash-list` (recycling list for high performance) |
| Sharing | `expo-sharing` (iOS playback/share), `expo-intent-launcher` (Android playback) |
| Package manager | Bun |

## Path Aliases (critical)

Defined in `tsconfig.json` — get these wrong and bundling fails.

```
@/lib/*   → ./lib/*        (ROOT — NOT src/lib/)
@/types/* → ./types/*      (ROOT — NOT src/types/)
@/assets/*→ ./assets/*
@/*       → ./src/*        (everything else under src/)
```

Any utility or type file imported via `@/lib/` or `@/types/` **must** live at the project root, not under `src/`.

## Project Layout

```
tik-down/
├── lib/                   # Shared utilities (importable as @/lib/*)
│   ├── api.ts             # fetchTikTokProfile — streams NDJSON from backend
│   ├── download.ts        # getDownloadUrl (axios → tikdownloader.io) + downloadVideo (FileSystem)
│   ├── mmkv.ts            # MMKV instance + Zustand storage adapter
│   ├── tiktok.ts          # normalizeUsername helper
│   ├── tw.ts              # twrnc instance + palette (single source of truth for colours)
│   └── validator.ts       # validateFileExists — check presence of files/SAF URIs
├── types/                 # Shared types (importable as @/types/*)
│   ├── api.ts             # VideoPost, TikTokThumbnail
│   ├── download.ts        # DownloadItem, DownloadStatus
│   └── profile.ts         # TikTokProfile, ProfilesStore
├── src/
│   ├── app/
│   │   ├── _layout.tsx    # Root layout — hydrates all stores, first-launch storage prompt
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx      # Tab bar (Ionicons icons, pastel primary tint)
│   │   │   ├── home.tsx         # Home tab — toggles between All and Accounts views
│   │   │   ├── tiktok.tsx       # Profile search + saved profile list
│   │   │   ├── instagram.tsx    # Instagram tab (stub)
│   │   │   └── settings.tsx     # Stats, storage location, danger zone
│   │   ├── profile/[username].tsx  # Profile detail — video list with per-video download status
│   │   └── history/[id].tsx     # Download detail
│   ├── components/
│   │   ├── home/                # Home screen sub-views
│   │   │   ├── all-tab.tsx      # List of all download history
│   │   │   └── accounts-tab.tsx # Summarized list of downloaded-from accounts
│   │   ├── download-card.tsx    # Reusable history item card with status/progress
│   │   ├── profile-card.tsx     # Saved-profile row with aggregate download progress bar
│   │   ├── folder-picker-modal.tsx  # Themed modal for storage-dir selection (SAF support)
│   │   └── ...                  # UI primitives (animated-icon, collapsible, etc.)
│   ├── constants/theme.ts       # Colors (light/dark), Spacing, Fonts — imports palette from @/lib/tw
│   ├── hooks/use-theme.ts       # useTheme() → Colors[scheme]
│   └── store/
│       ├── downloads.ts         # Zustand: download queue, runDownload, marks profile on completion
│       ├── profiles.ts          # Zustand: fetched TikTok profiles, downloadedVideoIds tracking
│       └── settings.ts          # Zustand: download dir (SAF or app-docs), first-launch flag
└── assets/                      # Images, fonts
```

## Theming

`lib/tw.ts` is the **single source of truth** for the colour palette. All other files import from it.

```ts
// Access colours in components
import { useTheme } from '@/hooks/use-theme';
const colors = useTheme(); // { background, backgroundElement, backgroundSelected, text, textSecondary, primary }

// Access in non-component code
import { palette } from '@/lib/tw';
```

Never hardcode hex values that duplicate palette entries.

## State Stores

### `useDownloadsStore` (`src/store/downloads.ts`)
Manages the download queue, concurrency, and performance. Key features:
- **Priority Queue**: `high` tier (user-initiated retries/single downloads) and `low` tier (bulk "Download All")
- **Worker Pool**: Limits simultaneous downloads via `concurrentDownloads` setting
- **Deduplication**: Prevents duplicate enqueuing of the same video
- **Backoff**: Detects HTTP 429 and applies exponential backoff (5s to 2min) to the queue
- **Performance**: Uses `itemsMap` for $O(1)$ lookups and targeted selectors to minimize re-renders

Key actions:
- `startDownload(video, profileUsername, profileUrl, priority)` — enqueues and triggers queue processing
- `retryDownload(id)` — resets status to `pending`, sets priority to `high`, and triggers processing
- `removeDownload(id)` — removes from history and triggers processing
- `processQueue()` — starts the next `pending` download if active downloads are below `concurrentDownloads` limit

On `status === 'done'`, automatically calls `useProfilesStore.getState().markVideoDownloaded(username, videoId)`.

`DownloadItem.progress` is a `0–1` float updated during download — subscribe to it for live progress UI.

### `useProfilesStore` (`src/store/profiles.ts`)
Persists fetched profiles to MMKV (`tik-down-profiles`).
- `fetchProfile(rawUsername)` — normalises username, calls `lib/api.ts`, preserves `downloadedVideoIds` on refresh
- `markVideoDownloaded(username, videoId)` — appends to profile's `downloadedVideoIds` and persists
- Old records missing `downloadedVideoIds` are migrated on load

### `useSettingsStore` (`src/store/settings.ts`)
Persists app settings to MMKV (`tik-down-settings`).
- `getDownloadDir()` — returns either SAF URI (`content://…`) or `documentDirectory/TikDown/`
- `pickDownloadDir()` — opens Android SAF folder picker
- `resetDownloadDir()` — reverts to app documents
- `concurrentDownloads` — user setting for maximum simultaneous downloads (1-5)

## Data Fetching & Caching

The app uses a layered caching architecture:

- **TanStack React Query**: Owns the fetch lifecycle (loading/error states), in-memory caching, and automated invalidation for *profile data* (video listings from the backend).
- **Zustand (`useProfilesStore`)**: Acts as the "Persistence Sink." React Query hooks (`useProfileQuery`) automatically pipe successful results into the Zustand store via the `saveProfile` action to ensure data survives app restarts via MMKV.
- **URL Cache (`tik-down-url-cache` MMKV instance)**: Caches resolved CDN download URLs from tikdownloader.io with a 6-hour TTL. Keyed by TikTok page URL. On a cache hit `getDownloadUrl` returns immediately without a network call — retries of the same video are near-instant and don't contribute to rate limit exposure.

Each cache layer is an independent MMKV instance with no key overlap.

## Download Flow

```
startDownload(video)
  → add to items with status: 'pending'
  → processQueue()
      → if activeCount < concurrentDownloads:
          → runDownload(item)
              → getDownloadUrl(webpageUrl)
                  → cache hit (TTL 6h)?  → return cached CDN URL immediately
                  → cache miss           → axios POST to tikdownloader.io, parse HTML → cache result
              → downloadVideo(url, filename, dir)   # expo-file-system createDownloadResumable
                  → SAF path (content://): check existing subDir → cache → createFileAsync → copyAsync (fallback: base64) → delete cache
                  → Normal path: stream directly to documentDirectory/TikDown/
              → markVideoDownloaded(username, id)   # persisted to profile store
              → processQueue()                      # trigger next in line
```

## Android Storage

The app uses Android Storage Access Framework (SAF) for user-chosen folders. SAF URIs start with `content://` and require `StorageAccessFramework.createFileAsync`.

**Subdirectory Reuse**: `lib/download.ts` uses `readDirectoryAsync` to scan for existing profile folders before creating new ones, preventing directory duplication when downloading from the same account.

**SAF Write Mutex**: Implements a per-directory lock (`safWriteLocks`) to prevent concurrent writes to the same SAF folder from blocking the JavaScript thread during Base64 transfers.

**Reliability Note**: `FileSystem.copyAsync` is known to fail with SAF URIs on some Android versions (throwing "directory cannot be created"). `lib/download.ts` handles this by falling back to a `Base64` transfer (`readAsStringAsync` -> `writeAsStringAsync`), which is slower but 100% reliable for SAF.

## Key Conventions

- **Persistence**: All store data is persisted via `react-native-mmkv`. Manual file-based JSON storage (storage.ts) is deprecated.
- **Type Checking**: Always use `tsgo` for TypeScript verification. It is provided by `@typescript/native-preview` and is optimized for this project's native stack.
- **Performance**: 
    - Use `FlashList` and `expo-image` for lists.
    - **Targeted Selectors**: Subscribe components to specific store keys (e.g., `s.itemsMap[id]`) instead of the whole store to prevent list-wide re-renders during progress updates.
    - **Memoization**: Wrap card components in `React.memo`.
- **Auto-Logging**: All critical operations in `lib/` and `src/store/` must use the global `Logger`. Errors and warnings are automatically surfaced in the global `LogsBottomSheet`.
- **Validation**:
    - **History Detail**: Pull-to-refresh verifies file existence and offers a manual retry if missing.
    - **Profile View**: Pull-to-refresh bulk-validates all downloaded videos for that profile and automatically re-queues missing ones.
    - **List Cards**: Tapping the "Downloaded" status pill in `VideoCard` or `DownloadCard` triggers a manual verification alert.
- **Deduplication**: The Home screen `AllTab` and `AccountsTab` deduplicate entries by `videoId`. History only shows the most recent download for a specific video.
- **External Playback**: The `HistoryDetailScreen` uses `IntentLauncher` (Android) and `Sharing` (iOS) to hand off video playback to the system's native player.
- **expo-file-system imports**: always use `expo-file-system/legacy` (SDK 55 moved the old API there)
- **No expo-symbols**: use `Ionicons` from `@expo/vector-icons` for all icons — expo-symbols is iOS-only
- **Nested Pressables**: used for download buttons inside tappable cards — React Native handles propagation correctly, inner press does not bubble to outer
- **Zustand outside React**: use `useStore.getState()` (e.g., `useSettingsStore.getState().getDownloadDir()`). Note that stores hydrate asynchronously on startup; use `onRehydrateStorage` for startup logic.
- **Backend**: profile data is fetched from `https://tik-down-backend.vercel.app/tiktok?u=<username>&limit=<n>` as NDJSON (one `VideoPost` JSON object per line)
- **Floating action button**: `src/components/global-fab.tsx` — animated menu-style FAB with backdrop blur. Draggable when collapsed via `Gesture.Exclusive(pan, tap)` from `react-native-gesture-handler`; snaps to nearest horizontal edge on release. When expanded, animates to a fixed full-width position regardless of drag position.
- **Bottom Sheets**: Uses `@gorhom/bottom-sheet`. The global `LogsBottomSheet` uses `BottomSheetModal` which requires `BottomSheetModalProvider` at the root (`_layout.tsx`).

## Sub-Agent Guides

For granular implementation details of specific layers, refer to:
- [Library Guide](./lib/AGENTS.md) — API, Download engine, SAF Mutex, and Validators.
- [Store Guide](./src/store/AGENTS.md) — Zustand architecture, Queue logic, and Performance optimizations.

## Running Locally

```bash
bun install
bun run android   # or: expo start --android
bun run ios
bun run web
```

TypeScript check:
```bash
bunx tsgo --noEmit
```
