export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .replace(/^@/, '')
    .replace(/.*tiktok\.com\/@?/, '')
    .split(/[?#]/)[0]
    .trim();
}
