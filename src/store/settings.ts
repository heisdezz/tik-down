import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { create } from 'zustand';

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
  } catch {
    return { downloadDirUri: null, hasAskedStorage: false };
  }
}

async function writeSettings(data: SettingsData): Promise<void> {
  await FileSystem.writeAsStringAsync(settingsFile(), JSON.stringify(data));
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  downloadDirUri: null,
  hasAskedStorage: false,
  loaded: false,

  load: async () => {
    const data = await readSettings();
    set({ ...data, loaded: true });
  },

  pickDownloadDir: async () => {
    if (Platform.OS !== 'android') {
      await writeSettings({ downloadDirUri: null, hasAskedStorage: true });
      set({ hasAskedStorage: true });
      return false;
    }

    const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    const hasAskedStorage = true;

    if (result.granted) {
      const data: SettingsData = { downloadDirUri: result.directoryUri, hasAskedStorage };
      await writeSettings(data);
      set(data);
      return true;
    }

    // User dismissed — keep default dir, mark as asked
    const data: SettingsData = { downloadDirUri: get().downloadDirUri, hasAskedStorage };
    await writeSettings(data);
    set({ hasAskedStorage });
    return false;
  },

  resetDownloadDir: async () => {
    const data: SettingsData = { downloadDirUri: null, hasAskedStorage: true };
    await writeSettings(data);
    set({ downloadDirUri: null, hasAskedStorage: true });
  },

  getDownloadDir: () => {
    return get().downloadDirUri ?? defaultDir();
  },
}));

export function parseDownloadDirLabel(uri: string | null): string {
  if (!uri) return 'App Documents / TikDown';
  try {
    const decoded = decodeURIComponent(uri);
    const colonIdx = decoded.lastIndexOf(':');
    if (colonIdx >= 0) {
      const path = decoded.slice(colonIdx + 1).replace(/\//g, ' › ');
      return path || 'Custom Folder';
    }
    return 'Custom Folder';
  } catch {
    return 'Custom Folder';
  }
}
