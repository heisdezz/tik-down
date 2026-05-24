# tik-down — Agent Guide

TikTok video downloader built with Expo SDK 55 / React Native. Targets Android (primary) and iOS.

## Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 55, expo-router (file-based routing) |
| Language | TypeScript (strict) |
| State | Zustand v5 |
| Styling | twrnc (Tailwind RN) + custom pastel palette |
| HTTP | axios (API calls), expo-file-system (file downloads) |
| Icons | `@expo/vector-icons` Ionicons — **not** expo-symbols (iOS-only) |
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
│   ├── storage.ts         # Downloads JSON persistence via expo-file-system/legacy
│   ├── tiktok.ts          # normalizeUsername helper
│   └── tw.ts              # twrnc instance + palette (single source of truth for colours)
├── types/                 # Shared types (importable as @/types/*)
│   ├── api.ts             # VideoPost, TikTokThumbnail
│   ├── download.ts        # DownloadItem, DownloadStatus
│   └── profile.ts         # TikTokProfile, ProfilesStore
├── src/
│   ├── app/
│   │   ├── _layout.tsx    # Root layout — hydrates all stores, first-launch storage prompt
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx      # Tab bar (Ionicons icons, pastel primary tint)
│   │   │   ├── home.tsx         # Home / history tab
│   │   │   ├── tiktok.tsx       # Profile search + saved profile list
│   │   │   ├── instagram.tsx    # Instagram tab (stub)
│   │   │   └── settings.tsx     # Stats, storage location, danger zone
│   │   ├── profile/[username].tsx  # Profile detail — video list with per-video download status
│   │   └── history/[id].tsx     # Download detail
│   ├── components/
│   │   ├── profile-card.tsx     # Saved-profile row with aggregate download progress bar
│   │   ├── folder-picker-modal.tsx  # Themed bottom-sheet for storage-dir selection
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
Manages the download queue. Key actions:
- `startDownload(video, profileUsername, profileUrl)` — enqueues and starts download
- `retryDownload(id)` — re-runs a failed item
- `removeDownload(id)` — removes from history

On `status === 'done'`, automatically calls `useProfilesStore.getState().markVideoDownloaded(username, videoId)`.

`DownloadItem.progress` is a `0–1` float updated during download — subscribe to it for live progress UI.

### `useProfilesStore` (`src/store/profiles.ts`)
Persists fetched profiles to `documentDirectory/tik-down-profiles.json`.
- `fetchProfile(rawUsername)` — normalises username, calls `lib/api.ts`, preserves `downloadedVideoIds` on refresh
- `markVideoDownloaded(username, videoId)` — appends to profile's `downloadedVideoIds` and persists
- Old records missing `downloadedVideoIds` are migrated on load

### `useSettingsStore` (`src/store/settings.ts`)
- `getDownloadDir()` — returns either SAF URI (`content://…`) or `documentDirectory/TikDown/`
- `pickDownloadDir()` — opens Android SAF folder picker
- `resetDownloadDir()` — reverts to app documents

## Download Flow

```
startDownload(video)
  → getDownloadUrl(webpageUrl)          # axios POST to tikdownloader.io, parses HTML for direct URL
  → downloadVideo(url, filename, dir)   # expo-file-system createDownloadResumable
      → SAF path (content://): cache → createFileAsync → copyAsync → delete cache
      → Normal path: stream directly to documentDirectory/TikDown/
  → markVideoDownloaded(username, id)   # persisted to profile store
```

## Android Storage

The app uses Android Storage Access Framework (SAF) for user-chosen folders. SAF URIs start with `content://` and require `StorageAccessFramework.createFileAsync` + `copyAsync` — direct writes are not possible.

On first launch `_layout.tsx` shows `<FolderPickerModal>` to let the user choose between app-documents and a custom folder.

## Key Conventions

- **expo-file-system imports**: always use `expo-file-system/legacy` (SDK 55 moved the old API there)
- **No expo-symbols**: use `Ionicons` from `@expo/vector-icons` for all icons — expo-symbols is iOS-only
- **Nested Pressables**: used for download buttons inside tappable cards — React Native handles propagation correctly, inner press does not bubble to outer
- **Zustand outside React**: use `useStore.getState()` (e.g., `useSettingsStore.getState().getDownloadDir()`)
- **Backend**: profile data is fetched from `https://tik-down-backend.vercel.app/tiktok?u=<username>&limit=<n>` as NDJSON (one `VideoPost` JSON object per line)

## Running Locally

```bash
bun install
bun run android   # or: expo start --android
bun run ios
bun run web
```

TypeScript check:
```bash
bunx tsc --noEmit
```
