import { NativeModules, Platform } from "react-native";

export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string | null;
  filesize: number | null;
  filesize_approx: number | null;
  vcodec: string | null;
  acodec: string | null;
  fps: number | null;
  tbr: number | null;
  abr: number | null;
  vbr: number | null;
  quality: number | null;
  format_note: string | null;
}

export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  duration: number | null;
  thumbnail: string | null;
  uploader: string | null;
  uploader_url: string | null;
  view_count: number | null;
  like_count: number | null;
  webpage_url: string;
  extractor: string;
  formats: VideoFormat[];
}

export interface DownloadResult {
  success: boolean;
  output_path: string;
}

const { YtDlp } = NativeModules;

function assertAndroid(): void {
  if (Platform.OS !== "android" || !YtDlp) {
    throw new Error("yt-dlp via Chaquopy is only available on Android.");
  }
}

/** Fetch metadata for a URL without downloading the video. */
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  assertAndroid();
  const raw: string = await YtDlp.getVideoInfo(url);
  const parsed = JSON.parse(raw);
  if (parsed.error) throw new Error(parsed.error);
  return parsed as VideoInfo;
}

/**
 * Download a video/audio stream.
 *
 * @param url        Video page URL
 * @param outputPath Android file path template, e.g. /sdcard/Download/%(title)s.%(ext)s
 * @param formatId   yt-dlp format selector (optional, defaults to best quality)
 */
export async function downloadVideo(
  url: string,
  outputPath: string,
  formatId?: string
): Promise<DownloadResult> {
  assertAndroid();
  const raw: string = await YtDlp.downloadVideo(url, outputPath, formatId ?? null);
  const parsed = JSON.parse(raw);
  if (parsed.error) throw new Error(parsed.error);
  return parsed as DownloadResult;
}
