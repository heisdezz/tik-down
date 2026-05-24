export interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface VideoPost {
  id: string;
  title: string;
  webpage_url?: string;
  url?: string;
  thumbnail?: string;
  thumbnails?: Thumbnail[];
  duration?: number;
  uploader?: string;
  view_count?: number;
  like_count?: number;
}

export interface ApiError {
  error: string;
  detail?: string;
}
