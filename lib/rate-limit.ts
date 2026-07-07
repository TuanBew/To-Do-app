const buckets = new Map<string, number[]>();

/**
 * Fixed-size sliding window limiter, in-memory per server instance.
 * On Vercel's serverless runtime each instance has its own state, so this
 * slows down casual brute-forcing but isn't a hard guarantee across instances —
 * Supabase Auth's own backend limits are the real backstop.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }

  hits.push(now);
  buckets.set(key, hits);

  // Opportunistic cleanup so the map doesn't grow unbounded over the process lifetime.
  if (buckets.size > 500) {
    for (const [k, h] of buckets) {
      if (!h.some((t) => now - t < windowMs)) buckets.delete(k);
    }
  }

  return true;
}
