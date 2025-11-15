const hits = new Map<string, { count: number; timestamp: number }>();

const WINDOW_MS = 60 * 1000;
const MAX_HITS = 10;

export function isRateLimited(ip: string | null | undefined) {
  if (!ip) return false;
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.timestamp > WINDOW_MS) {
    hits.set(ip, { count: 1, timestamp: now });
    return false;
  }
  entry.count += 1;
  hits.set(ip, entry);
  return entry.count > MAX_HITS;
}
