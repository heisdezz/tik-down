import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { fetchTikTokProfile } from "@/lib/api";
import { normalizeUsername } from "@/lib/tiktok";
import { ProfilesStore, TikTokProfile } from "@/types/profile";
import Logger from "@/lib/logger";
import { mmkvStorage } from "@/lib/mmkv";

export const useProfilesStore = create<ProfilesStore>()(
  persist(
    (set, get) => ({
      profiles: [],
      hydrated: false,
      fetching: {},
      errors: {},

      hydrate: async () => {
        // Handled by persist middleware
        set({ hydrated: true });
      },

      fetchProfile: async (rawUsername) => {
        const username = normalizeUsername(rawUsername);
        const url = `https://www.tiktok.com/@${username}`;
        Logger.info("Fetching profile data", { username });

        set((s) => ({
          fetching: { ...s.fetching, [username]: true },
          errors: { ...s.errors, [username]: null },
        }));

        const videos: TikTokProfile["videos"] = [];

        try {
          await fetchTikTokProfile(username, (video) => {
            videos.push(video);
          });

          const existing = get().profiles.find((p) => p.username === username);
          const profile: TikTokProfile = {
            username,
            url,
            videos,
            fetchedAt: Date.now(),
            downloadedVideoIds: existing?.downloadedVideoIds ?? [],
          };

          get().saveProfile(profile);

          Logger.info("Profile data fetched successfully", {
            username,
            videoCount: videos.length,
          });
          return profile;
        } catch (err) {
          if ((err as Error).name === "AbortError") {
            Logger.info("Profile fetch aborted", { username });
            // Re-throw or return existing if possible, but throwing is safer for mutations
            throw err;
          }
          const msg =
            err instanceof Error ? err.message : "Failed to fetch profile";
          Logger.error("Profile fetch failed", { username, error: msg });
          set((s) => ({ errors: { ...s.errors, [username]: msg } }));
          throw new Error(msg);
        } finally {
          set((s) => ({ fetching: { ...s.fetching, [username]: false } }));
        }
      },

      saveProfile: (profile) => {
        set((s) => {
          const idx = s.profiles.findIndex(
            (p) => p.username === profile.username,
          );
          const updated =
            idx >= 0
              ? s.profiles.map((p) =>
                  p.username === profile.username ? profile : p,
                )
              : [profile, ...s.profiles];
          return { profiles: updated };
        });
      },

      removeProfile: (username) => {
        Logger.info("Removing profile", { username });
        set((s) => {
          const profiles = s.profiles.filter((p) => p.username !== username);
          return { profiles };
        });
      },

      markVideoDownloaded: (username, videoId) => {
        Logger.info("Marking video as downloaded in profile", {
          username,
          videoId,
        });
        set((s) => {
          const profiles = s.profiles.map((p) => {
            if (p.username !== username) return p;
            if (p.downloadedVideoIds.includes(videoId)) return p;
            return {
              ...p,
              downloadedVideoIds: [...p.downloadedVideoIds, videoId],
            };
          });
          return { profiles };
        });
      },
    }),
    {
      name: "tik-down-profiles",
      storage: createJSONStorage(() => mmkvStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          Logger.info("Profiles rehydrated from MMKV");
        }
      },
    },
  ),
);
