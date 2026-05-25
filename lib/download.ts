import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import { createMMKV } from "react-native-mmkv";
import Logger from "@/lib/logger";

const API_ENDPOINT = "https://tikdownloader.io/api/ajaxSearch";

const urlCache = createMMKV({ id: "tik-down-url-cache" });
const URL_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

function getCachedUrl(tiktokUrl: string): string | null {
  const raw = urlCache.getString(tiktokUrl);
  if (!raw) return null;
  const { url, expiresAt } = JSON.parse(raw) as {
    url: string;
    expiresAt: number;
  };
  if (Date.now() > expiresAt) {
    urlCache.remove(tiktokUrl);
    return null;
  }
  return url;
}

function setCachedUrl(tiktokUrl: string, resolvedUrl: string): void {
  urlCache.set(
    tiktokUrl,
    JSON.stringify({ url: resolvedUrl, expiresAt: Date.now() + URL_CACHE_TTL }),
  );
}

async function ensureDir(dir: string): Promise<void> {
  if (dir.startsWith("content://")) return;
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch (err) {
    Logger.error("Failed to ensure directory exists", {
      dir,
      error: (err as Error).message,
    });
    throw err;
  }
}

export async function getDownloadUrl(tiktokUrl: string): Promise<string> {
  const cached = getCachedUrl(tiktokUrl);
  if (cached) {
    Logger.debug("URL cache hit", { tiktokUrl });
    return cached;
  }
  Logger.info("Extracting download URL", { tiktokUrl });
  try {
    const { data } = await axios.post<{ status: string; data: string }>(
      API_ENDPOINT,
      new URLSearchParams({ q: tiktokUrl, lang: "en" }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
          Referer: "https://tikdownloader.io/",
        },
      },
    );

    if (data.status !== "ok") {
      Logger.error("tikdownloader.io API error", { status: data.status });
      throw new Error(`API returned: ${data.status}`);
    }

    const html = data.data
      .replace(/\\r\\n/g, " ")
      .replace(/\\"/g, '"')
      .replace(/\\\//g, "/");

    const hdMatch = html.match(
      /href="([^"]+)"[^>]*>[^<]*<i[^>]*><\/i>[^<]*Download MP4 HD/,
    );
    if (hdMatch?.[1]) {
      const url = hdMatch[1].replace(/&amp;/g, "&");
      setCachedUrl(tiktokUrl, url);
      return url;
    }

    const snapMatches = [
      ...html.matchAll(/href="(https?:\/\/dl\.snapcdn[^"]+)"/g),
    ];
    const snapUrl = snapMatches.find((m) => !m[1].includes(".mp3"))?.[1];
    if (snapUrl) {
      const url = snapUrl.replace(/&amp;/g, "&");
      setCachedUrl(tiktokUrl, url);
      return url;
    }

    const cdnMatch = html.match(/href="(https:\/\/v16[^"]+)"/);
    if (cdnMatch?.[1]) {
      const url = cdnMatch[1].replace(/&amp;/g, "&");
      setCachedUrl(tiktokUrl, url);
      return url;
    }

    Logger.warn("Regex failed to find a valid MP4 URL", { tiktokUrl });
    throw new Error("Could not extract download URL from response");
  } catch (err) {
    Logger.error("getDownloadUrl failed", {
      tiktokUrl,
      error: (err as Error).message,
    });
    throw err;
  }
}

const safWriteLocks = new Set<string>();

async function acquireLock(dir: string): Promise<void> {
  while (safWriteLocks.has(dir)) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  safWriteLocks.add(dir);
}

function releaseLock(dir: string): void {
  safWriteLocks.delete(dir);
}

export async function downloadVideo(
  url: string,
  filename: string,
  baseDir: string,
  subDir: string | null,
  onProgress: (progress: number) => void,
): Promise<string> {
  Logger.info("Starting video download", { filename, baseDir, subDir });

  let destDir = baseDir;
  const isSAF = baseDir.startsWith("content://");

  if (subDir) {
    if (isSAF) {
      try {
        const files =
          await FileSystem.StorageAccessFramework.readDirectoryAsync(baseDir);
        const subDirName = subDir.replace(/\//g, "_"); // Sanitize

        // Try to find existing directory
        const existing = files.find((f) => {
          const decoded = decodeURIComponent(f);
          return (
            decoded.endsWith(`/${subDirName}`) ||
            decoded.endsWith(`/${subDirName}/`)
          );
        });

        if (existing) {
          destDir = existing;
          Logger.debug("Using existing SAF subdirectory", { destDir });
        } else {
          destDir = await FileSystem.StorageAccessFramework.makeDirectoryAsync(
            baseDir,
            subDirName,
          );
          Logger.debug("Created new SAF subdirectory", { destDir });
        }
      } catch (e) {
        Logger.warn("Failed to manage SAF subdirectory, falling back to base", {
          error: (e as Error).message,
        });
      }
    } else {
      destDir = baseDir.endsWith("/")
        ? `${baseDir}${subDir}/`
        : `${baseDir}/${subDir}/`;
      await ensureDir(destDir);
    }
  }

  if (isSAF) {
    // Download to cache, then move into the SAF directory
    const cacheDir =
      FileSystem.cacheDirectory ?? `${FileSystem.documentDirectory}cache/`;
    await ensureDir(cacheDir);
    const cacheFile = cacheDir + filename;

    const task = FileSystem.createDownloadResumable(
      url,
      cacheFile,
      {},
      (snap) => {
        if (snap.totalBytesExpectedToWrite > 0) {
          onProgress(snap.totalBytesWritten / snap.totalBytesExpectedToWrite);
        }
      },
    );

    Logger.debug("Downloading to cache for SAF transfer", { cacheFile });
    const result = await task.downloadAsync();
    if (!result?.uri) {
      Logger.error("Cache download failed", { filename });
      throw new Error("Download failed");
    }

    try {
      await acquireLock(destDir);
      const safFileUri =
        await FileSystem.StorageAccessFramework.createFileAsync(
          destDir,
          filename,
          "video/mp4",
        );

      try {
        // Attempt fast copy first
        await FileSystem.copyAsync({ from: cacheFile, to: safFileUri });
        Logger.debug("SAF fast copy successful", { safFileUri });
      } catch (e) {
        Logger.warn("SAF fast copy failed, falling back to Base64 transfer", {
          error: (e as Error).message,
        });
        const base64 = await FileSystem.readAsStringAsync(cacheFile, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await FileSystem.writeAsStringAsync(safFileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        Logger.debug("SAF Base64 transfer complete", { safFileUri });
      } finally {
        releaseLock(destDir);
      }

      FileSystem.deleteAsync(cacheFile, { idempotent: true }).catch(() => {});
      return safFileUri;
    } catch (err) {
      releaseLock(destDir);
      Logger.error("SAF createFileAsync failed", {
        destDir,
        filename,
        error: (err as Error).message,
      });
      throw err;
    }
  }

  // Normal file:// destination
  await ensureDir(destDir);
  const filePath = destDir + (destDir.endsWith("/") ? "" : "/") + filename;

  const task = FileSystem.createDownloadResumable(url, filePath, {}, (snap) => {
    if (snap.totalBytesExpectedToWrite > 0) {
      onProgress(snap.totalBytesWritten / snap.totalBytesExpectedToWrite);
    }
  });

  const result = await task.downloadAsync();
  if (!result?.uri) {
    Logger.error("Direct download failed", { filePath });
    throw new Error("Download completed but no file URI returned");
  }
  Logger.info("Download complete", { filePath });
  return result.uri;
}
