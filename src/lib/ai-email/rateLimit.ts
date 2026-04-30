export type RateLimitAction = "generate" | "refine";

export type RateLimitRemaining = {
  generatesToday: number;
  generatesThisHour: number;
  refinesToday: number;
};

export type RateLimitResult =
  | { allowed: true; remaining: RateLimitRemaining }
  | { allowed: false; type: "daily" | "hourly"; resetAt: string; remaining: RateLimitRemaining };

type Counter = {
  count: number;
  resetAt: number;
};

const counters = new Map<string, Counter>();

const LIMITS = {
  generateDaily: 5,
  generateHourly: 3,
  refineDaily: 30,
};

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

function startOfNextUtcDay(now: Date) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
}

function startOfNextUtcHour(now: Date) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1);
}

function getCounter(key: string, resetAt: number, nowMs: number): Counter {
  const existing = counters.get(key);
  if (existing && existing.resetAt > nowMs) return existing;

  const fresh = { count: 0, resetAt };
  counters.set(key, fresh);
  return fresh;
}

function remainingFor(ip: string, now: Date): RateLimitRemaining {
  const nowMs = now.getTime();
  const dayReset = startOfNextUtcDay(now);
  const hourReset = startOfNextUtcHour(now);
  const genDaily = getCounter(`${ip}:generate:day`, dayReset, nowMs);
  const genHourly = getCounter(`${ip}:generate:hour`, hourReset, nowMs);
  const refineDaily = getCounter(`${ip}:refine:day`, dayReset, nowMs);

  return {
    generatesToday: Math.max(0, LIMITS.generateDaily - genDaily.count),
    generatesThisHour: Math.max(0, LIMITS.generateHourly - genHourly.count),
    refinesToday: Math.max(0, LIMITS.refineDaily - refineDaily.count),
  };
}

export function checkRateLimit(action: RateLimitAction, ip: string, now = new Date()): RateLimitResult {
  if (import.meta.env.DEV || import.meta.env.MODE === "test" || ip === "unknown") {
    return { allowed: true, remaining: remainingFor(ip, now) };
  }

  const nowMs = now.getTime();
  const dayReset = startOfNextUtcDay(now);
  const hourReset = startOfNextUtcHour(now);
  const remaining = remainingFor(ip, now);

  if (action === "generate") {
    const daily = getCounter(`${ip}:generate:day`, dayReset, nowMs);
    const hourly = getCounter(`${ip}:generate:hour`, hourReset, nowMs);

    if (daily.count >= LIMITS.generateDaily) {
      return { allowed: false, type: "daily", resetAt: new Date(dayReset).toISOString(), remaining };
    }
    if (hourly.count >= LIMITS.generateHourly) {
      return { allowed: false, type: "hourly", resetAt: new Date(hourReset).toISOString(), remaining };
    }

    daily.count += 1;
    hourly.count += 1;
    return { allowed: true, remaining: remainingFor(ip, now) };
  }

  const refineDaily = getCounter(`${ip}:refine:day`, dayReset, nowMs);
  if (refineDaily.count >= LIMITS.refineDaily) {
    return { allowed: false, type: "daily", resetAt: new Date(dayReset).toISOString(), remaining };
  }

  refineDaily.count += 1;
  return { allowed: true, remaining: remainingFor(ip, now) };
}

export function resetRateLimitForTests(): void {
  counters.clear();
}
