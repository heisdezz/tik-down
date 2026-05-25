import { create } from "zustand";
import { VideoPost } from "@/types/api";
import { DownloadItem, DownloadStatus } from "@/types/download";
import { getDownloadUrl, downloadVideo } from "@/lib/download";
import * as storage from "@/lib/storage";
import { useSettingsStore } from "@/store/settings";
import { useProfilesStore } from "@/store/profiles";
import Logger from "@/lib/logger";

interface DownloadsStore {
  items: DownloadItem[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  startDownload: (
    video: VideoPost,
    profileUsername: string,
    profileUrl: string,
  ) => Promise<void>;
  retryDownload: (id: string) => Promise<void>;
  removeDownload: (id: string) => Promise<void>;
}

async function runDownload(
  item: DownloadItem,
  set: (fn: (s: DownloadsStore) => Partial<DownloadsStore>) => void,
) {
  Logger.info("Initiating download sequence", {
    id: item.id,
    videoId: item.videoId,
  });
  const update = (u: Partial<DownloadItem>) => {
    const merged = { ...u, updatedAt: Date.now() };
    set((s) => ({
      items: s.items.map((i) => (i.id === item.id ? { ...i, ...merged } : i)),
    }));
    storage
      .loadDownloads()
      .then((all) => {
        const idx = all.findIndex((i) => i.id === item.id);
        if (idx >= 0)
          storage.saveAllDownloads(
            all.map((i) => (i.id === item.id ? { ...i, ...merged } : i)),
          );
      })
      .catch((err) => {
        Logger.error("Failed to sync download state to storage", {
          id: item.id,
          error: (err as Error).message,
        });
      });
  };

  try {
    update({ status: "fetching_url" as DownloadStatus });
    const downloadUrl = await getDownloadUrl(item.webpageUrl);

    update({ status: "downloading" as DownloadStatus, progress: 0 });
    const filename = `${item.videoId || item.id}.mp4`;
    const destDir = useSettingsStore.getState().getDownloadDir();
    const localPath = await downloadVideo(
      downloadUrl,
      filename,
      destDir,
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
    const errorMsg = err instanceof Error ? err.message : "Download failed";
    Logger.error("Download sequence failed", { id: item.id, error: errorMsg });
    update({ status: "failed" as DownloadStatus, error: errorMsg });
  }
}

export const useDownloadsStore = create<DownloadsStore>((set, get) => ({
  items: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const items = await storage.loadDownloads();
      const reset = items.map((i) =>
        i.status === "downloading" || i.status === "fetching_url"
          ? { ...i, status: "failed" as DownloadStatus, error: "Interrupted" }
          : i,
      );
      set({ items: reset, hydrated: true });
      Logger.info("Downloads store hydrated", { count: reset.length });
    } catch (err) {
      Logger.error("Failed to hydrate downloads store", {
        error: (err as Error).message,
      });
    }
  },

  startDownload: async (video, profileUsername, profileUrl) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    Logger.info("Queuing new download", { videoId: video.id, profileUsername });
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set((s) => ({ items: [item, ...s.items] }));
    await storage.persistDownload(item);
    runDownload(item, set);
  },

  retryDownload: async (id) => {
    Logger.info("Retrying download", { id });
    const item = get().items.find((i) => i.id === id);
    if (!item) {
      Logger.warn("Attempted to retry non-existent download", { id });
      return;
    }
    const reset: DownloadItem = {
      ...item,
      status: "pending",
      error: undefined,
      progress: undefined,
    };
    set((s) => ({ items: s.items.map((i) => (i.id === id ? reset : i)) }));
    await storage.persistDownload(reset);
    runDownload(reset, set);
  },

  removeDownload: async (id) => {
    Logger.info("Removing download from history", { id });
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    await storage.removePersistedDownload(id);
  },
}));
