# tik-down — Store (`src/store/`) Implementation Guide

State management layer powered by Zustand v5, specializing in persistent, high-performance stores with complex side effects.

---

## `downloads.ts` — Downloads Store
The most complex store in the application, managing a prioritized, rate-limited download queue.
- **`itemsMap` & Performance**: Maintains a Record of `videoId_username` to `DownloadItem`. This allows $O(1)$ targeted selectors in the UI (e.g., `VideoCard`), preventing massive re-renders when progress updates.
- **Priority Queue**:
  - **High Tier**: User-initiated single downloads or retries.
  - **Low Tier**: Bulk "Download All" operations.
  - `processQueue` always picks High priority items first.
- **Worker Pool**: Limits concurrent downloads based on the `concurrentDownloads` setting (default 2, max 5).
- **Rate Limit & Backoff**:
  - Detects HTTP 429 from providers.
  - Pauses the queue and applies exponential backoff (starting at 5s, doubling up to 2min).
  - Automatically schedules a queue resume after the backoff period.
- **Rehydration Recovery**: On app launch, any items stuck in `downloading` or `fetching_url` are reset to `pending` and re-queued.
- **Deduplication**: Enforces a single active task per `videoId` to prevent redundant network and disk usage.

## `profiles.ts` — Profiles Store
Manages cached TikTok profile data and tracks download history per user.
- **Integration with React Query**: Works in tandem with `useProfileQuery`. While React Query handles the in-memory cache and fetch states, this store provides a permanent, persistent home for profile data via MMKV.
- **`saveProfile`**: A low-level action used by React Query's `queryFn` to sink fetched data into the persistent store.
- **Download Tracking**: Maintains a `downloadedVideoIds` array per profile. This is preserved even when refreshing a profile, allowing the UI to accurately show which videos have already been captured.
- **MMKV Storage**: Uses the `tik-down-profiles` key.

## `settings.ts` — Settings Store
App configuration and storage permissions.
- **Storage Management**:
  - **SAF (Android)**: Handles the Storage Access Framework handshake. Returns `content://` URIs for external folders.
  - **Internal**: Falls back to `documentDirectory/TikDown/`.
- **UI State**: Manages `showFolderPicker` to control the global storage selection modal from anywhere in the app.
- **Concurrency Config**: Controls the `concurrentDownloads` limit used by the Downloads Store.
- **MMKV Storage**: Uses the `tik-down-settings` key.

## `auth.ts` — Auth Store
Persistence for TikTok session cookies.
- **Session Management**: Stores the raw cookie string extracted from the login portal.
- **Metadata**: Tracks the last update time to help with session expiration logic.
- **MMKV Storage**: Uses the `tik-down-auth` key.

---

## Shared Characteristics
- **Persistence**: All stores use `react-native-mmkv` via `createJSONStorage` for near-instant hydration.
- **Hydration Logic**: Uses `onRehydrateStorage` to perform startup tasks like queue recovery or marking the store as `loaded`.
- **External Access**: Designed to be usable outside of React components via `.getState()` (e.g., used by the Logger or background tasks).

---

[← Back to Main Guide](../../AGENTS.md)
