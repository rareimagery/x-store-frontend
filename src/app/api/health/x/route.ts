import { NextResponse } from "next/server";

const X_API_BEARER = process.env.X_API_BEARER_TOKEN;
const X_CLIENT_ID = process.env.X_CLIENT_ID;

/**
 * GET /api/health/x
 * Validates X API v2 connectivity: bearer token, user lookup, rate limit status.
 */
export async function GET() {
  const start = Date.now();
  const checks: { name: string; ok: boolean; ms: number; detail?: string }[] = [];

  // 1. Bearer token configured
  checks.push({
    name: "bearer_token",
    ok: !!X_API_BEARER && X_API_BEARER.length > 10,
    ms: 0,
    detail: X_API_BEARER ? `Configured (${X_API_BEARER.slice(0, 8)}...)` : "Missing X_API_BEARER_TOKEN",
  });

  // 2. OAuth client configured
  checks.push({
    name: "oauth_client",
    ok: !!X_CLIENT_ID,
    ms: 0,
    detail: X_CLIENT_ID ? `Client ID: ${X_CLIENT_ID.slice(0, 12)}...` : "Missing X_CLIENT_ID",
  });

  // 3. X API v2 user lookup (test with @rareimagery)
  if (X_API_BEARER) {
    try {
      const t0 = Date.now();
      const res = await fetch(
        "https://api.x.com/2/users/by/username/rareimagery?user.fields=id,name,username,verified",
        { headers: { Authorization: `Bearer ${X_API_BEARER}` }, cache: "no-store" }
      );
      const data = await res.json();
      const rateRemaining = res.headers.get("x-rate-limit-remaining");
      const rateReset = res.headers.get("x-rate-limit-reset");

      checks.push({
        name: "user_lookup",
        ok: res.ok && !!data.data?.id,
        ms: Date.now() - t0,
        detail: res.ok
          ? `@rareimagery found (id: ${data.data?.id})`
          : `HTTP ${res.status}: ${data.detail || data.title || "Failed"}`,
      });

      checks.push({
        name: "rate_limit",
        ok: rateRemaining ? parseInt(rateRemaining) > 5 : true,
        ms: 0,
        detail: rateRemaining
          ? `${rateRemaining} remaining, resets ${rateReset ? new Date(parseInt(rateReset) * 1000).toISOString() : "unknown"}`
          : "Rate limit headers not available",
      });
    } catch (err: any) {
      checks.push({ name: "user_lookup", ok: false, ms: Date.now() - start, detail: err.message });
    }
  } else {
    checks.push({ name: "user_lookup", ok: false, ms: 0, detail: "Skipped — no bearer token" });
  }

  const allOk = checks.every((c) => c.ok);
  return NextResponse.json({
    service: "x-api",
    status: allOk ? "healthy" : "degraded",
    totalMs: Date.now() - start,
    checks,
  }, { status: allOk ? 200 : 503 });
}
