import * as FileSystem from 'expo-file-system/legacy';
import { DownloadItem } from '@/types/download';

const FILE_URI = `${FileSystem.documentDirectory}tik-down-downloads.json`;

export async function loadDownloads(): Promise<DownloadItem[]> {
  try {
    const info = await FileSystem.getInfoAsync(FILE_URI);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(FILE_URI);
    return JSON.parse(raw) as DownloadItem[];
  } catch {
    return [];
  }
}

export async function saveAllDownloads(items: DownloadItem[]): Promise<void> {
  await FileSystem.writeAsStringAsync(FILE_URI, JSON.stringify(items));
}

export async function persistDownload(item: DownloadItem): Promise<void> {
  const items = await loadDownloads();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    items[idx] = item;
  } else {
    items.unshift(item);
  }
  await saveAllDownloads(items);
}

export async function removePersistedDownload(id: string): Promise<void> {
  const items = await loadDownloads();
  await saveAllDownloads(items.filter((i) => i.id !== id));
}
