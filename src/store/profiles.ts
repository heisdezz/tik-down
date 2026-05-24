import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';

import { fetchTikTokProfile } from '@/lib/api';
import { normalizeUsername } from '@/lib/tiktok';
import { ProfilesStore, TikTokProfile } from '@/types/profile';

const FILE_URI = `${FileSystem.documentDirectory}tik-down-profiles.json`;

async function loadPersisted(): Promise<TikTokProfile[]> {
  try {
    const info = await FileSystem.getInfoAsync(FILE_URI);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(FILE_URI);
    const parsed = JSON.parse(raw) as TikTokProfile[];
    // Migrate older records that may lack downloadedVideoIds
    return parsed.map((p) => ({ downloadedVideoIds: [], ...p }));
  } catch {
    return [];
  }
}

async function savePersisted(profiles: TikTokProfile[]): Promise<void> {
  await FileSystem.writeAsStringAsync(FILE_URI, JSON.stringify(profiles));
}

export const useProfilesStore = create<ProfilesStore>((set, get) => ({
  profiles: [],
  hydrated: false,
  fetching: {},
  errors: {},

  hydrate: async () => {
    const profiles = await loadPersisted();
    set({ profiles, hydrated: true });
  },

  fetchProfile: async (rawUsername) => {
    const username = normalizeUsername(rawUsername);
    const url = `https://www.tiktok.com/@${username}`;

    set((s) => ({
      fetching: { ...s.fetching, [username]: true },
      errors: { ...s.errors, [username]: null },
    }));

    const videos: TikTokProfile['videos'] = [];

    try {
      await fetchTikTokProfile(username, 30, (video) => {
        videos.push(video);
      });

      set((s) => {
        const existing = s.profiles.find((p) => p.username === username);
        // Preserve downloadedVideoIds across refresh
        const profile: TikTokProfile = {
          username,
          url,
          videos,
          fetchedAt: Date.now(),
          downloadedVideoIds: existing?.downloadedVideoIds ?? [],
        };
        const idx = s.profiles.findIndex((p) => p.username === username);
        const updated =
          idx >= 0
            ? s.profiles.map((p) => (p.username === username ? profile : p))
            : [profile, ...s.profiles];
        savePersisted(updated).catch(() => {});
        return { profiles: updated };
      });

      return username;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return username;
      const msg = err instanceof Error ? err.message : 'Failed to fetch profile';
      set((s) => ({ errors: { ...s.errors, [username]: msg } }));
      throw new Error(msg);
    } finally {
      set((s) => ({ fetching: { ...s.fetching, [username]: false } }));
    }
  },

  removeProfile: (username) => {
    set((s) => {
      const profiles = s.profiles.filter((p) => p.username !== username);
      savePersisted(profiles).catch(() => {});
      return { profiles };
    });
  },

  markVideoDownloaded: (username, videoId) => {
    set((s) => {
      const profiles = s.profiles.map((p) => {
        if (p.username !== username) return p;
        if (p.downloadedVideoIds.includes(videoId)) return p;
        return { ...p, downloadedVideoIds: [...p.downloadedVideoIds, videoId] };
      });
      savePersisted(profiles).catch(() => {});
      return { profiles };
    });
  },
}));
