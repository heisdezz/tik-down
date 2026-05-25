import { VideoPost } from "./api";

export interface TikTokProfile {
  username: string;
  url: string;
  videos: VideoPost[];
  fetchedAt: number;
  downloadedVideoIds: string[];
}

export interface ProfilesStore {
  profiles: TikTokProfile[];
  hydrated: boolean;
  fetching: Record<string, boolean>;
  errors: Record<string, string | null>;
  hydrate: () => Promise<void>;
  fetchProfile: (rawUsername: string) => Promise<string>;
  saveProfile: (profile: TikTokProfile) => void;
  removeProfile: (username: string) => void;
  markVideoDownloaded: (username: string, videoId: string) => void;
}
