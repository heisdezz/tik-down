import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import Logger from "@/lib/logger";
import { mmkvStorage } from "@/lib/mmkv";

interface SettingsData {
  downloadDirUri: string | null;
  hasAskedStorage: boolean;
  concurrentDownloads: number;
}

interface SettingsStore extends SettingsData {
  loaded: boolean;
  load: () => Promise<void>;
  pickDownloadDir: () => Promise<boolean>;
  resetDownloadDir: () => Promise<void>;
  getDownloadDir: () => string;
  setConcurrentDownloads: (count: number) => void;
}

function defaultDir(): string {
  return `${FileSystem.documentDirectory}TikDown/`;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      downloadDirUri: null,
      hasAskedStorage: false,
      concurrentDownloads: 2,
      loaded: false,

      load: async () => {
        // With MMKV + Persist, this is mostly handled by onRehydrateStorage
        // But we keep it for compatibility with existing layout logic
        set({ loaded: true });
      },

      pickDownloadDir: async () => {
        Logger.info("Initiating download directory picker");
        if (Platform.OS !== "android") {
          Logger.info("Skipping directory picker, not on Android");
          set({ hasAskedStorage: true });
          return false;
        }

        try {
          const result =
            await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          const hasAskedStorage = true;

          if (result.granted) {
            Logger.info("Directory permissions granted", {
              uri: result.directoryUri,
            });
            set({
              downloadDirUri: result.directoryUri,
              hasAskedStorage,
            });
            return true;
          }

          Logger.info("Directory permissions denied by user");
          set({ hasAskedStorage });
          return false;
        } catch (err) {
          Logger.error("Error during directory permission request", {
            error: (err as Error).message,
          });
          return false;
        }
      },

      resetDownloadDir: async () => {
        Logger.info("Resetting download directory to App Documents");
        set({ downloadDirUri: null, hasAskedStorage: true });
      },

      getDownloadDir: () => {
        return get().downloadDirUri ?? defaultDir();
      },

      setConcurrentDownloads: (count) => {
        set({ concurrentDownloads: Math.max(1, Math.min(5, count)) });
      },
    }),
    {
      name: "tik-down-settings",
      storage: createJSONStorage(() => mmkvStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.loaded = true;
          Logger.info("Settings rehydrated from MMKV");
        }
      },
    },
  ),
);

export function parseDownloadDirLabel(uri: string | null): string {
  if (!uri) return "App Documents / TikDown";
  try {
    const decoded = decodeURIComponent(uri);
    const colonIdx = decoded.lastIndexOf(":");
    if (colonIdx >= 0) {
      const path = decoded.slice(colonIdx + 1).replace(/\//g, " › ");
      return path || "Custom Folder";
    }
    return "Custom Folder";
  } catch {
    return "Custom Folder";
  }
}
