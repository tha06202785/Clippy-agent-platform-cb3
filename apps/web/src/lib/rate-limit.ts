// Simple in-memory rate limiter for Vercel serverless
// Uses a Map with IP-based tracking and sliding window

const rateMap = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,     // 30 requests per minute
};

const AI_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 10,     // 10 AI requests per minute (cost control)
};

const AUTH_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 5,      // 5 auth attempts per minute (brute force protection)
};

export function getRateLimitConfig(path: string): RateLimitConfig {
  if (path.includes("/api/ai/") || path.includes("/api/copilot/")) {
    return AI_CONFIG;
  }
  if (path.includes("/api/auth/")) {
    return AUTH_CONFIG;
  }
  return DEFAULT_CONFIG;
}

export function checkRateLimit(ip: string, path: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const config = getRateLimitConfig(path);
  const now = Date.now();
  const key = ip + ":" + path;

  let entry = rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs };
    rateMap.set(key, entry);
  }

  entry.count++;

  // Cleanup old entries every 100 requests
  if (rateMap.size > 1000) {
    const cutoff = now - 60000;
    for (const [k, v] of rateMap) {
      if (v.resetAt < cutoff) rateMap.delete(k);
    }
  }

  return {
    allowed: entry.count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

export function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "127.0.0.1";
}
