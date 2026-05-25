# tik-down — Library (`lib/`) Implementation Guide

Core utility layer for API interaction, file system management, state persistence, and styling.

---

## `api.ts` — TikTok API
Handles communication with the backend for fetching TikTok profile data.
- **`fetchTikTokProfile`**: Streams NDJSON from `https://tik-down-backend.vercel.app/tiktok`.
- **Streaming Support**: Uses `ReadableStream` (via `res.body.getReader()`) to process videos as they arrive, falling back to full-text parsing if streaming is unavailable in the environment.

## `download.ts` — Video Downloader
The central engine for extracting direct links and managing the download lifecycle.
- **URL Caching**: Uses a dedicated MMKV instance (`tik-down-url-cache`) to store resolved MP4 URLs for 6 hours, reducing redundant API calls and scraping.
- **`getDownloadUrl`**: Scrapes `tikdownloader.io` using `axios`. Uses multiple regex patterns to extract the highest quality MP4 URL (HD, SnapCDN, or direct CDN).
- **`downloadVideo`**: Orchestrates the transfer from URL to local storage.
  - **SAF Support**: For Android `content://` URIs, it downloads to a temporary cache first, then transfers to the destination.
  - **SAF Write Mutex**: Uses a `Set` based lock (`safWriteLocks`) to prevent concurrent writes to the same directory, avoiding thread-blocking during Base64 transfers.
  - **Directory Reuse**: Scans for existing profile subdirectories using `readDirectoryAsync` to prevent duplication.
  - **Fallback Path**: Automatically switches from `copyAsync` to `Base64` string transfer if standard Android file operations fail for SAF URIs.

## `logger.ts` — Global Logger
In-memory logging system with subscription support.
- **Levels**: `debug`, `info`, `warn`, `error`.
- **Buffer**: Maintains a rolling buffer of the last 500 logs.
- **Subscriptions**: Powering the global `LogsBottomSheet` UI component.

## `mmkv.ts` — Persistence Layer
High-performance storage bridge.
- **Instance**: Single MMKV instance `tik-down-storage`.
- **Adapter**: Implements Zustand's `StateStorage` interface (`setItem`, `getItem`, `removeItem`) for use with the `persist` middleware.

## `tiktok.ts` — TikTok Helpers
Domain-specific utility functions.
- **`normalizeUsername`**: Cleans raw input, stripping `@` symbols and extracting usernames from full TikTok URLs.

## `tw.ts` — Styling & Palette
The single source of truth for the application's visual identity.
- **Palette**: Defines `light`, `dark`, and `status` (success, error, warning) colour sets.
- **twrnc**: Configures a custom Tailwind instance with app-wide semantic tokens (`bg-light`, `bg-el-dark`, etc.) and a standard `borderRadius.app`.

## `validator.ts` — File Validation
Safety checks for the filesystem.
- **`validateFileExists`**: Verifies if a file is present at a given path. Crucially handles both standard `file://` paths and SAF `content://` URIs using `FileSystem.getInfoAsync`.
- **Usage**: Used for pull-to-refresh integrity checks in the History Detail and Profile views, as well as manual re-check buttons in list cards.

---

[← Back to Main Guide](../AGENTS.md)
