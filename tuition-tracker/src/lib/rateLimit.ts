const buckets = new Map<string, number[]>();

function prune(key: string, windowMs: number, now: number): number[] {
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length) buckets.set(key, arr);
  else buckets.delete(key);
  return arr;
}


export function isLimited(key: string, max: number, windowMs: number): boolean {
  return prune(key, windowMs, Date.now()).length >= max;
}


export function recordHit(key: string, windowMs: number): void {
  const now = Date.now();
  const arr = prune(key, windowMs, now);
  arr.push(now);
  buckets.set(key, arr);


  if (buckets.size > 5000) {
    for (const k of buckets.keys()) prune(k, windowMs, now);
  }
}


export function resetKey(key: string): void {
  buckets.delete(key);
}

export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
