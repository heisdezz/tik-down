import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { VideoPost } from "@/types/api";
import { DownloadItem, DownloadStatus } from "@/types/download";
import { getDownloadUrl, downloadVideo } from "@/lib/download";
import { useSettingsStore } from "@/store/settings";
import { useProfilesStore } from "@/store/profiles";
import Logger from "@/lib/logger";
import { mmkvStorage } from "@/lib/mmkv";
import axios from "axios";

const BACKOFF_BASE_MS = 5_000;
const BACKOFF_MAX_MS = 120_000;

interface DownloadsStore {
  items: DownloadItem[];
  itemsMap: Record<string, DownloadItem>; // videoId_username -> DownloadItem
  hydrated: boolean;
  rateLimitUntil: number;
  backoffMs: number;
  hydrate: () => Promise<void>;
  startDownload: (
    video: VideoPost,
    profileUsername: string,
    profileUrl: string,
    priority?: "high" | "low",
  ) => Promise<void>;
  retryDownload: (id: string) => Promise<void>;
  removeDownload: (id: string) => Promise<void>;
  processQueue: () => void;
  setRateLimit: () => void;
  clearRateLimit: () => void;
}

async function runDownload(
  item: DownloadItem,
  set: (fn: (s: DownloadsStore) => Partial<DownloadsStore>) => void,
  get: () => DownloadsStore,
) {
  Logger.info("Initiating download sequence", {
    id: item.id,
    videoId: item.videoId,
  });

  const update = (u: Partial<DownloadItem>) => {
    const merged = { ...u, updatedAt: Date.now() };
    const key = `${item.videoId}_${item.profileUsername}`;
    set((s) => ({
      items: s.items.map((i) => (i.id === item.id ? { ...i, ...merged } : i)),
      itemsMap: { ...s.itemsMap, [key]: { ...s.itemsMap[key], ...merged } },
    }));
  };

  try {
    update({ status: "fetching_url" as DownloadStatus });
    const downloadUrl = await getDownloadUrl(item.webpageUrl);

    // If we were rate limited before, clear it on success
    if (get().rateLimitUntil > 0) {
      get().clearRateLimit();
    }

    update({ status: "downloading" as DownloadStatus, progress: 0 });
    const filename = `${item.videoId || item.id}.mp4`;
    const baseDir = useSettingsStore.getState().getDownloadDir();
    const subDir = item.profileUsername || null;

    const localPath = await downloadVideo(
      downloadUrl,
      filename,
      baseDir,
      subDir,
      (progress) => {
        update({ progress });
      },
    );

    update({ status: "done" as DownloadStatus, progress: 1, localPath });
    Logger.info("Download sequence completed successfully", {
      id: item.id,
      localPath,
    });
    if (item.profileUsername && item.videoId) {
      useProfilesStore
        .getState()
        .markVideoDownloaded(item.profileUsername, item.videoId);
    }
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      Logger.warn("Rate limited by provider, applying backoff", {
        id: item.id,
      });
      get().setRateLimit();
      update({
        status: "pending" as DownloadStatus,
        error: "Rate limited, retrying soon...",
      });
      return;
    }

    const errorMsg = err instanceof Error ? err.message : "Download failed";
    Logger.error("Download sequence failed", { id: item.id, error: errorMsg });
    update({ status: "failed" as DownloadStatus, error: errorMsg });
  } finally {
    // Check if more downloads are in queue
    get().processQueue();
  }
}

export const useDownloadsStore = create<DownloadsStore>()(
  persist(
    (set, get) => ({
      items: [],
      itemsMap: {},
      hydrated: false,
      rateLimitUntil: 0,
      backoffMs: BACKOFF_BASE_MS,

      hydrate: async () => {
        // Handled by persist middleware
        set({ hydrated: true });
      },

      setRateLimit: () => {
        set((s) => {
          const nextBackoff = Math.min(s.backoffMs * 2, BACKOFF_MAX_MS);
          return {
            rateLimitUntil: Date.now() + s.backoffMs,
            backoffMs: nextBackoff,
          };
        });
        // Schedule queue processing after backoff
        setTimeout(() => get().processQueue(), get().backoffMs + 100);
      },

      clearRateLimit: () => {
        set({ rateLimitUntil: 0, backoffMs: BACKOFF_BASE_MS });
      },

      processQueue: () => {
        const { items, rateLimitUntil } = get();

        // Bail if rate limited
        if (rateLimitUntil > Date.now()) {
          return;
        }

        const concurrentLimit = useSettingsStore.getState().concurrentDownloads;

        const activeCount = items.filter(
          (i) => i.status === "downloading" || i.status === "fetching_url",
        ).length;

        if (activeCount >= concurrentLimit) return;

        // Priority queue: high first, then low
        const highPriority = items.find(
          (i) => i.status === "pending" && i.priority === "high",
        );
        const next = highPriority || items.find((i) => i.status === "pending");

        if (next) {
          runDownload(next, set, get);
        }
      },

      startDownload: async (
        video,
        profileUsername,
        profileUrl,
        priority = "low",
      ) => {
        const { itemsMap } = get();
        const key = `${video.id}_${profileUsername}`;

        // Deduplication: check if already in queue or active
        const existing = itemsMap[key];
        if (
          existing &&
          (existing.status === "pending" ||
            existing.status === "downloading" ||
            existing.status === "fetching_url")
        ) {
          Logger.info("Skipping enqueue: already active", {
            videoId: video.id,
          });
          return;
        }

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        Logger.info("Queuing new download", {
          videoId: video.id,
          profileUsername,
          priority,
        });
        const webpageUrl = video.webpage_url ?? video.url ?? "";
        const thumbnail = video.thumbnails?.at(-1)?.url ?? video.thumbnail;

        const item: DownloadItem = {
          id,
          videoId: video.id,
          profileUsername,
          profileUrl,
          title: video.title || "Untitled",
          thumbnail,
          webpageUrl,
          status: "pending",
          priority,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((s) => ({
          items: [item, ...s.items],
          itemsMap: { ...s.itemsMap, [key]: item },
        }));
        get().processQueue();
      },

      retryDownload: async (id) => {
        Logger.info("Retrying download", { id });
        const item = get().items.find((i) => i.id === id);
        if (!item) {
          Logger.warn("Attempted to retry non-existent download", { id });
          return;
        }
        const key = `${item.videoId}_${item.profileUsername}`;
        const reset: DownloadItem = {
          ...item,
          status: "pending",
          priority: "high", // Retry is usually user-initiated
          error: undefined,
          progress: undefined,
        };
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? reset : i)),
          itemsMap: { ...s.itemsMap, [key]: reset },
        }));
        get().processQueue();
      },

      removeDownload: async (id) => {
        Logger.info("Removing download from history", { id });
        const item = get().items.find((i) => i.id === id);
        if (item) {
          const key = `${item.videoId}_${item.profileUsername}`;
          set((s) => {
            const newMap = { ...s.itemsMap };
            delete newMap[key];
            return {
              items: s.items.filter((i) => i.id !== id),
              itemsMap: newMap,
            };
          });
        }
        get().processQueue();
      },
    }),
    {
      name: "tik-down-downloads",
      storage: createJSONStorage(() => mmkvStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset stuck downloads and re-enqueue them
          state.items = state.items.map((i) =>
            i.status === "downloading" || i.status === "fetching_url"
              ? {
                  ...i,
                  status: "pending" as DownloadStatus,
                  error: undefined,
                }
              : i,
          );

          // Rebuild itemsMap
          state.itemsMap = {};
          for (const item of state.items) {
            state.itemsMap[`${item.videoId}_${item.profileUsername}`] = item;
          }

          state.hydrated = true;
          Logger.info("Downloads rehydrated from MMKV");

          // Kick off queue processing after hydration settles
          setTimeout(() => state.processQueue(), 100);
        }
      },
    },
  ),
);
