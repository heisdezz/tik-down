import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTikTokProfile } from "@/lib/api";
import { normalizeUsername } from "@/lib/tiktok";
import { VideoPost } from "@/types/api";
import { TikTokProfile } from "@/types/profile";
import { useProfilesStore } from "@/store/profiles";
import Logger from "@/lib/logger";

export function useProfileQuery(rawUsername: string) {
  const username = normalizeUsername(rawUsername);
  const { profiles } = useProfilesStore();
  const existingProfile = profiles.find((p) => p.username === username);

  return useQuery({
    queryKey: ["profile", username],
    queryFn: async (): Promise<TikTokProfile> => {
      const videos: VideoPost[] = [];
      try {
        await fetchTikTokProfile(username, 30, (video) => {
          videos.push(video);
        });

        const profile: TikTokProfile = {
          username,
          url: `https://www.tiktok.com/@${username}`,
          videos,
          fetchedAt: Date.now(),
          downloadedVideoIds: existingProfile?.downloadedVideoIds ?? [],
        };

        // Persist to store
        useProfilesStore.getState().saveProfile(profile);

        return profile;
      } catch (err) {
        Logger.error(`React Query fetch failed for @${username}`, {
          error: (err as Error).message,
        });
        throw err;
      }
    },

    enabled: !!username,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const { fetchProfile } = useProfilesStore();

  return useMutation({
    mutationFn: async (username: string) => {
      await fetchProfile(username);
      // The store update is already handled inside fetchProfile
      return username;
    },
    onSuccess: (username) => {
      queryClient.invalidateQueries({ queryKey: ["profile", username] });
    },
  });
}
