import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';

const API_ENDPOINT = 'https://tikdownloader.io/api/ajaxSearch';

async function ensureDir(dir: string): Promise<void> {
  if (dir.startsWith('content://')) return;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export async function getDownloadUrl(tiktokUrl: string): Promise<string> {
  const { data } = await axios.post<{ status: string; data: string }>(
    API_ENDPOINT,
    new URLSearchParams({ q: tiktokUrl, lang: 'en' }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        Referer: 'https://tikdownloader.io/',
      },
    },
  );

  if (data.status !== 'ok') throw new Error(`API returned: ${data.status}`);

  const html = data.data
    .replace(/\\r\\n/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/');

  const hdMatch = html.match(/href="([^"]+)"[^>]*>[^<]*<i[^>]*><\/i>[^<]*Download MP4 HD/);
  if (hdMatch?.[1]) return hdMatch[1].replace(/&amp;/g, '&');

  const snapMatches = [...html.matchAll(/href="(https?:\/\/dl\.snapcdn[^"]+)"/g)];
  const snapUrl = snapMatches.find((m) => !m[1].includes('.mp3'))?.[1];
  if (snapUrl) return snapUrl.replace(/&amp;/g, '&');

  const cdnMatch = html.match(/href="(https:\/\/v16[^"]+)"/);
  if (cdnMatch?.[1]) return cdnMatch[1].replace(/&amp;/g, '&');

  throw new Error('Could not extract download URL from response');
}

export async function downloadVideo(
  url: string,
  filename: string,
  destDir: string,
  onProgress: (progress: number) => void,
): Promise<string> {
  const isSAF = destDir.startsWith('content://');

  if (isSAF) {
    // Download to cache, then move into the SAF directory
    const cacheDir = FileSystem.cacheDirectory ?? `${FileSystem.documentDirectory}cache/`;
    await ensureDir(cacheDir);
    const cacheFile = cacheDir + filename;

    const task = FileSystem.createDownloadResumable(url, cacheFile, {}, (snap) => {
      if (snap.totalBytesExpectedToDownload > 0) {
        onProgress(snap.totalBytesWritten / snap.totalBytesExpectedToDownload);
      }
    });

    const result = await task.downloadAsync();
    if (!result?.uri) throw new Error('Download failed');

    const safFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      destDir,
      filename,
      'video/mp4',
    );
    await FileSystem.copyAsync({ from: cacheFile, to: safFileUri });
    FileSystem.deleteAsync(cacheFile, { idempotent: true }).catch(() => {});

    return safFileUri;
  }

  // Normal file:// destination
  await ensureDir(destDir);
  const filePath = destDir + filename;

  const task = FileSystem.createDownloadResumable(url, filePath, {}, (snap) => {
    if (snap.totalBytesExpectedToDownload > 0) {
      onProgress(snap.totalBytesWritten / snap.totalBytesExpectedToDownload);
    }
  });

  const result = await task.downloadAsync();
  if (!result?.uri) throw new Error('Download completed but no file URI returned');
  return result.uri;
}
