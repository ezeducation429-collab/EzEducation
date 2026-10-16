type RateLimitRecord = {
  count: number;
  resetTime: number;
};

const trackerMap = new Map<string, RateLimitRecord>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetSeconds: number } {
  const now = Date.now();
  const record = trackerMap.get(key);

  if (!record || now > record.resetTime) {
    trackerMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetSeconds: Math.ceil(windowMs / 1000) };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetSeconds: Math.ceil((record.resetTime - now) / 1000) };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetSeconds: Math.ceil((record.resetTime - now) / 1000),
  };
}

// Auto-clean stale records every 2 minutes
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of trackerMap.entries()) {
      if (now > v.resetTime) {
        trackerMap.delete(k);
      }
    }
  }, 120000);
  if (timer.unref) timer.unref();
}
