export type DownloadStatus =
  | "pending"
  | "fetching_url"
  | "downloading"
  | "done"
  | "failed";

export interface DownloadItem {
  id: string;
  videoId: string;
  profileUsername: string;
  profileUrl: string;
  title: string;
  thumbnail?: string;
  webpageUrl: string;
  status: DownloadStatus;
  priority: "high" | "low";
  progress?: number;
  localPath?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}
