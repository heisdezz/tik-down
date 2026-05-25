import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { VideoPost } from "@/types/api";
import { DownloadItem, DownloadStatus } from "@/types/download";
import { getDownloadUrl, downloadVideo } from "@/lib/download";
import { useSettingsStore } from "@/store/settings";
import { useProfilesStore } from "@/store/profiles";
import Logger from "@/lib/logger";
import { mmkvStorage } from "@/lib/mmkv";

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
  };

  try {
    update({ status: "fetching_url" as DownloadStatus });
    const downloadUrl = await getDownloadUrl(item.webpageUrl);

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
    const errorMsg = err instanceof Error ? err.message : "Download failed";
    Logger.error("Download sequence failed", { id: item.id, error: errorMsg });
    update({ status: "failed" as DownloadStatus, error: errorMsg });
  }
}

export const useDownloadsStore = create<DownloadsStore>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,

      hydrate: async () => {
        // Handled by persist middleware
        set({ hydrated: true });
      },

      startDownload: async (video, profileUsername, profileUrl) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        Logger.info("Queuing new download", {
          videoId: video.id,
          profileUsername,
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
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((s) => ({ items: [item, ...s.items] }));
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
        runDownload(reset, set);
      },

      removeDownload: async (id) => {
        Logger.info("Removing download from history", { id });
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },
    }),
    {
      name: "tik-down-downloads",
      storage: createJSONStorage(() => mmkvStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset stuck downloads on rehydrate
          state.items = state.items.map((i) =>
            i.status === "downloading" || i.status === "fetching_url"
              ? {
                  ...i,
                  status: "failed" as DownloadStatus,
                  error: "Interrupted",
                }
              : i,
          );
          state.hydrated = true;
          Logger.info("Downloads rehydrated from MMKV");
        }
      },
    },
  ),
);
