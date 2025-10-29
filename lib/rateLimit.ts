type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit({ key, limit, windowMs }: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 } as const;
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: b.resetAt - now } as const;
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count } as const;
}

