# Copilot instructions for tik-down

Purpose

Short, actionable guidance for Copilot sessions operating in the tik-down repo. Use this file to discover repository-specific workflows, commands, and conventions — read AGENTS.md and lib/AGENTS.md for deeper implementation details.

Build, test and lint commands

- Install deps: `bun install` (preferred) or `npm install`.
- Start development (Expo):
  - Android: `bun run android` (alias: `expo start --android`)
  - iOS: `bun run ios` (alias: `expo start --ios`)
  - Web: `bun run web` (alias: `expo start --web`)
- General dev server: `bun run web` / `expo start`.
- Lint: `bun run lint` (runs `expo lint`).
- Type-check (MANDATORY before PRs): `bunx tsgo --noEmit` (use this exact command; do NOT use plain `tsc`).
- Tests: No test framework is present in the repository. If tests are added, follow the project's package.json scripts (`npm`/`bun` scripts). To run a single test when a test runner is added, prefer the test-runner's single-test flag (e.g. `jest path/to/test -t "name"`).

High-level architecture (big picture)

- Stack: Expo SDK 55 + React Native + TypeScript, package manager: Bun.
- Layers:
  - lib/: core utilities (api.ts, download.ts, mmkv.ts, tiktok.ts, tw.ts, validator.ts). Responsible for download engine, MMKV adapter and SAF handling.
  - src/app/: Expo Router file-based routes (root _layout.tsx, tabs, profile/[username].tsx, history). UI and hydration of stores.
  - src/store/: Zustand stores (downloads, profiles, settings, auth) — stores persist to MMKV via lib/mmkv.ts and implement queueing/concurrency logic.
  - types/: Shared TypeScript types used across lib/ and src/.
  - assets/: images/fonts referenced by the app.
- Backend: `https://tik-down-backend.vercel.app/tiktok` streams NDJSON (used by lib/api.ts). The app uses streaming Reader when available.
- Download flow (summary): useDownloadsStore → getDownloadUrl (lib/download.ts, with URL cache in MMKV) → downloadVideo (expo-file-system legacy) → mark video done in profiles store.
- Android specifics: Storage Access Framework (SAF) support with write-mutex and Base64 fallback for unreliable copy APIs.

Key conventions and gotchas

- Path aliases (CRITICAL): defined in tsconfig.json:
  - `@/lib/*` → `./lib/*` (root lib/)
  - `@/types/*` → `./types/*` (root types/)
  - `@/assets/*` → `./assets/*`
  - `@/*` → `./src/*`
  Files imported via `@/lib/` or `@/types/` MUST live at project root (not under src/).

- Type checking: ALWAYS run `bunx tsgo --noEmit` before merging. This repo relies on `@typescript/native-preview`'s tsgo instead of tsc.

- expo-file-system: import from `expo-file-system/legacy` (SDK 55 behaviour) where used in lib/download.ts.

- MMKV persistence: Zustand stores use `react-native-mmkv` via the adapter in lib/mmkv.ts. Treat these stores as the authoritative persistence layer (do not add alternate file-based persistence).

- Download store semantics:
  - Priority queue with `high` and `low` tiers.
  - `concurrentDownloads` setting limits worker pool (1–5).
  - Downloads deduplicate by video id and mark profiles via `markVideoDownloaded` when complete.
  - Backoff on 429 responses.

- Targeted selectors: UI components subscribe to specific store keys (e.g., `s.itemsMap[id]`) to avoid large re-renders. Follow this pattern when adding new list UIs.

- Logging: Use the global Logger (lib/logger.ts) for critical operations — logs are surfaced in the UI `LogsBottomSheet`.

- Icons: Use Ionicons from `@expo/vector-icons`. Do NOT use expo-symbols (iOS-only) even though it's in dependencies; project standard is Ionicons.

- Styling: `lib/tw.ts` is the single source of truth for the colour palette. Avoid hardcoding duplicate hex values.

- SAF and File operations: lib/download.ts implements SAF write-mutex and a Base64 fallback. When changing file code, preserve these safeguards.

Important docs to read

- AGENTS.md (root) — high-level architecture and store / agent descriptions.
- lib/AGENTS.md — deep dive into download engine, SAF mutex, mmkv adapters and validators.
- src/store/AGENTS.md — store internals, queue behavior, and performance notes.

AI-assistant / agent files to consider

- AGENTS.md and lib/AGENTS.md contain explicit agent-guides and must be consulted by Copilot-like sessions for implementation details.
- GEMINI.md / TikDown.md: project notes and API details; consult if present.

Commit and CI notes for Copilot sessions

- The repository expects TypeScript verification (`bunx tsgo --noEmit`) before publishing changes. Include type-checking in any Copilot-generated PR drafts.

If you want an MCP server configured (e.g., Playwright for web), say so and list which tool or runner to wire.

---

Summary: created repository-specific Copilot instructions covering build/test/lint commands, high-level architecture, and key conventions. If you want additional coverage (examples for common edits, code-mod rules, or a checklist for PRs), say which area to expand.
