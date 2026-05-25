import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import Logger from "@/lib/logger";

const API_ENDPOINT = "https://tikdownloader.io/api/ajaxSearch";

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
    if (hdMatch?.[1]) return hdMatch[1].replace(/&amp;/g, "&");

    const snapMatches = [
      ...html.matchAll(/href="(https?:\/\/dl\.snapcdn[^"]+)"/g),
    ];
    const snapUrl = snapMatches.find((m) => !m[1].includes(".mp3"))?.[1];
    if (snapUrl) return snapUrl.replace(/&amp;/g, "&");

    const cdnMatch = html.match(/href="(https:\/\/v16[^"]+)"/);
    if (cdnMatch?.[1]) return cdnMatch[1].replace(/&amp;/g, "&");

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
        destDir = await FileSystem.StorageAccessFramework.makeDirectoryAsync(
          baseDir,
          subDir,
        );
        Logger.debug("Using SAF subdirectory", { destDir });
      } catch (e) {
        Logger.warn(
          "Failed to create/get SAF subdirectory, falling back to base",
          { error: (e as Error).message },
        );
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
      }

      FileSystem.deleteAsync(cacheFile, { idempotent: true }).catch(() => {});
      return safFileUri;
    } catch (err) {
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
