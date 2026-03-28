/**
 * Simple in-memory rate limiter with periodic cleanup.
 * Each instance tracks requests by key (userId or IP).
 */

import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function createRateLimiter(opts: {
  limit: number;
  windowMs: number;
}): (key: string) => RateLimitResult {
  const store = new Map<string, RateLimitEntry>();

  // Cleanup expired entries every 5 minutes
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  let lastCleanup = Date.now();

  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }

  return (key: string): RateLimitResult => {
    cleanup();
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      return { allowed: true, remaining: opts.limit - 1, retryAfterMs: 0 };
    }

    if (entry.count < opts.limit) {
      entry.count++;
      return {
        allowed: true,
        remaining: opts.limit - entry.count,
        retryAfterMs: 0,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  };
}

/** Helper to get client IP from request */
export function getClientIP(req: Request): string {
  const forwarded =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

/** Return a 429 response with Retry-After header */
export function rateLimitResponse(retryAfterMs: number) {
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
      },
    }
  );
}
