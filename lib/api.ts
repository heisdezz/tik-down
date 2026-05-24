import { VideoPost } from '@/types/api';

const BASE_URL = 'https://tik-down-backend.vercel.app';

export async function fetchTikTokProfile(
  username: string,
  limit: number,
  onVideo: (video: VideoPost) => void,
  signal?: AbortSignal,
): Promise<void> {
  const params = new URLSearchParams({ u: username, limit: String(limit) });
  const res = await fetch(`${BASE_URL}/tiktok?${params}`, { signal });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error ?? 'Failed to fetch profile');
  }

  function processLines(text: string) {
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        onVideo(JSON.parse(line) as VideoPost);
      } catch {}
    }
  }

  if (res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          onVideo(JSON.parse(line) as VideoPost);
        } catch {}
      }
    }

    if (buf.trim()) processLines(buf);
  } else {
    // React Native's fetch may not expose ReadableStream
    const text = await res.text();
    processLines(text);
  }
}
