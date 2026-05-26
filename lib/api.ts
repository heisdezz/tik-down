import { VideoPost } from "@/types/api";
import Logger from "@/lib/logger";
import { useAuthStore } from "@/store/auth";

const BASE_URL = "https://tik-down-backend.vercel.app";

export async function fetchTikTokProfile(
  username: string,
  onVideo: (video: VideoPost) => void,
  limit?: number,
  signal?: AbortSignal,
): Promise<void> {
  const session = useAuthStore.getState().tiktok;
  const sessionIdMatch = session?.cookies.match(/(?:^|;)\s*sessionid=([^;]+)/);
  const tt_session_id = sessionIdMatch ? sessionIdMatch[1] : null;

  let url = `${BASE_URL}/tiktok`;
  let options: RequestInit = { signal };

  if (tt_session_id) {
    Logger.info(`Fetching profile (Auth): @${username}`, { limit });
    options = {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ u: username, tt_session_id, limit }),
    };
  } else {
    Logger.info(`Fetching profile: @${username}`, { limit });
    const params = new URLSearchParams({ u: username });
    if (limit !== undefined) params.append("limit", String(limit));
    url += `?${params}`;
  }

  const res = await fetch(url, options).catch((err) => {
    Logger.error(`Network error fetching @${username}`, {
      error: err.message,
    });
    throw err;
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    Logger.error(`API Error for @${username}: ${res.status}`, { body });
    throw new Error(body.error ?? "Failed to fetch profile");
  }

  function processLines(text: string) {
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        onVideo(JSON.parse(line) as VideoPost);
      } catch (err) {
        Logger.warn(`Failed to parse NDJSON line for @${username}`, {
          line: line.substring(0, 50),
        });
      }
    }
  }

  if (res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          onVideo(JSON.parse(line) as VideoPost);
        } catch (err) {
          Logger.warn(`Failed to parse streamed NDJSON line for @${username}`, {
            line: line.substring(0, 50),
          });
        }
      }
    }

    if (buf.trim()) processLines(buf);
  } else {
    // React Native's fetch may not expose ReadableStream
    Logger.info(
      `Streaming not supported, falling back to full text for @${username}`,
    );
    const text = await res.text();
    processLines(text);
  }
}
