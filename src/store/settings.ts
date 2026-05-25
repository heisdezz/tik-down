import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { create } from "zustand";
import Logger from "@/lib/logger";

interface SettingsData {
  downloadDirUri: string | null;
  hasAskedStorage: boolean;
}

interface SettingsStore extends SettingsData {
  loaded: boolean;
  load: () => Promise<void>;
  pickDownloadDir: () => Promise<boolean>;
  resetDownloadDir: () => Promise<void>;
  getDownloadDir: () => string;
}

function settingsFile(): string {
  return `${FileSystem.documentDirectory}tik-down-settings.json`;
}

function defaultDir(): string {
  return `${FileSystem.documentDirectory}TikDown/`;
}

async function readSettings(): Promise<SettingsData> {
  try {
    const info = await FileSystem.getInfoAsync(settingsFile());
    if (!info.exists) return { downloadDirUri: null, hasAskedStorage: false };
    const raw = await FileSystem.readAsStringAsync(settingsFile());
    return JSON.parse(raw) as SettingsData;
  } catch (err) {
    Logger.error("Failed to read settings from storage", {
      error: (err as Error).message,
    });
    return { downloadDirUri: null, hasAskedStorage: false };
  }
}

async function writeSettings(data: SettingsData): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(settingsFile(), JSON.stringify(data));
  } catch (err) {
    Logger.error("Failed to write settings to storage", {
      error: (err as Error).message,
    });
  }
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  downloadDirUri: null,
  hasAskedStorage: false,
  loaded: false,

  load: async () => {
    Logger.info("Loading settings");
    const data = await readSettings();
    set({ ...data, loaded: true });
    Logger.info("Settings loaded", { downloadDirUri: data.downloadDirUri });
  },

  pickDownloadDir: async () => {
    Logger.info("Initiating download directory picker");
    if (Platform.OS !== "android") {
      Logger.info("Skipping directory picker, not on Android");
      await writeSettings({ downloadDirUri: null, hasAskedStorage: true });
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
        const data: SettingsData = {
          downloadDirUri: result.directoryUri,
          hasAskedStorage,
        };
        await writeSettings(data);
        set(data);
        return true;
      }

      Logger.info("Directory permissions denied by user");
      // User dismissed — keep default dir, mark as asked
      const data: SettingsData = {
        downloadDirUri: get().downloadDirUri,
        hasAskedStorage,
      };
      await writeSettings(data);
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
    const data: SettingsData = { downloadDirUri: null, hasAskedStorage: true };
    await writeSettings(data);
    set({ downloadDirUri: null, hasAskedStorage: true });
  },

  getDownloadDir: () => {
    return get().downloadDirUri ?? defaultDir();
  },
}));

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
