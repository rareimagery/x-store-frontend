// ---------------------------------------------------------------------------
// API Agent — monitors token health, X data sync, and rate limits
// Raw X API v2 fetch per x-api-integration.md
// ---------------------------------------------------------------------------

import { X_API_BASE, xApiHeaders } from "@/lib/x-api/client";
import { fetchWithRetry } from "@/lib/x-api/fetch-with-retry";
import { getAllCreatorProfiles, DRUPAL_API_URL } from "@/lib/drupal";
import { syncXDataToDrupal } from "@/lib/x-import";
import { sendEmail } from "@/lib/notifications";
import type { CreatorProfile } from "@/lib/drupal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenCheck {
  name: string;
  valid: boolean;
  error?: string;
  latencyMs: number;
}

export interface RateLimitInfo {
  endpoint: string;
  limit: number | null;
  remaining: number | null;
  resetsAt: string | null;
  percentUsed: number | null;
}

export interface ProfileSyncResult {
  username: string;
  synced: boolean;
  error?: string;
}

export interface ApiAgentReport {
  timestamp: string;
  durationMs: number;
  tokenChecks: TokenCheck[];
  rateLimits: RateLimitInfo[];
  profileSyncs: ProfileSyncResult[];
  totalProfiles: number;
  profilesSynced: number;
  issues: string[];
  status: "healthy" | "degraded" | "critical";
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ADMIN_EMAIL =
  process.env.CONSOLE_ADMIN_EMAIL || "admin@rareimagery.net";
const SYNC_BATCH_SIZE = 3;

// ---------------------------------------------------------------------------
// Token health checks — raw fetch to api.x.com/2/
// ---------------------------------------------------------------------------

async function checkBearerToken(): Promise<TokenCheck> {
  const start = Date.now();
  try {
    const res = await fetch(
      `${X_API_BASE}/users/by/username/x?user.fields=id`,
      { headers: xApiHeaders(), signal: AbortSignal.timeout(10000) }
    );
    return {
      name: "X_API_BEARER_TOKEN",
      valid: res.ok,
      error: res.ok ? undefined : `HTTP ${res.status}`,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      name: "X_API_BEARER_TOKEN",
      valid: false,
      error: err.message ?? "Unknown error",
      latencyMs: Date.now() - start,
    };
  }
}

async function checkXaiToken(): Promise<TokenCheck> {
  const start = Date.now();
  const key = process.env.XAI_API_KEY;
  if (!key) {
    return {
      name: "XAI_API_KEY",
      valid: false,
      error: "Not configured",
      latencyMs: 0,
    };
  }

  try {
    const res = await fetch("https://api.x.ai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    return {
      name: "XAI_API_KEY",
      valid: res.ok,
      error: res.ok ? undefined : `HTTP ${res.status}`,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      name: "XAI_API_KEY",
      valid: false,
      error: err.message,
      latencyMs: Date.now() - start,
    };
  }
}

async function checkDrupalToken(): Promise<TokenCheck> {
  const start = Date.now();
  try {
    const res = await fetch(`${DRUPAL_API_URL}/jsonapi`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.DRUPAL_API_USER}:${process.env.DRUPAL_API_PASS}`).toString("base64")}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    return {
      name: "DRUPAL_API (Basic Auth)",
      valid: res.ok,
      error: res.ok ? undefined : `HTTP ${res.status}`,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      name: "DRUPAL_API (Basic Auth)",
      valid: false,
      error: err.message,
      latencyMs: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// Rate limit monitoring — reads x-rate-limit-* headers per spec
// ---------------------------------------------------------------------------

async function checkRateLimits(): Promise<RateLimitInfo[]> {
  const limits: RateLimitInfo[] = [];
  const bearerToken = process.env.X_API_BEARER_TOKEN;
  if (!bearerToken) return limits;

  const endpoints = [
    { name: "/2/users/by/username", url: `${X_API_BASE}/users/by/username/x` },
    { name: "/2/tweets/search/recent", url: `${X_API_BASE}/tweets/search/recent?query=from:x&max_results=10` },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        headers: xApiHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      const limit = res.headers.get("x-rate-limit-limit");
      const remaining = res.headers.get("x-rate-limit-remaining");
      const reset = res.headers.get("x-rate-limit-reset");

      const limitNum = limit ? parseInt(limit, 10) : null;
      const remainingNum = remaining ? parseInt(remaining, 10) : null;

      limits.push({
        endpoint: ep.name,
        limit: limitNum,
        remaining: remainingNum,
        resetsAt: reset ? new Date(parseInt(reset, 10) * 1000).toISOString() : null,
        percentUsed:
          limitNum && remainingNum !== null
            ? Math.round(((limitNum - remainingNum) / limitNum) * 100)
            : null,
      });
    } catch {
      limits.push({
        endpoint: ep.name,
        limit: null,
        remaining: null,
        resetsAt: null,
        percentUsed: null,
      });
    }
  }

  return limits;
}

// ---------------------------------------------------------------------------
// Profile data sync — raw fetch to resolve X user ID by username
// ---------------------------------------------------------------------------

async function syncStaleProfiles(
  profiles: CreatorProfile[]
): Promise<ProfileSyncResult[]> {
  const results: ProfileSyncResult[] = [];
  const active = profiles.filter((p) => p.linked_store_id);
  const batch = active.slice(0, SYNC_BATCH_SIZE);

  for (const profile of batch) {
    try {
      const res = await fetchWithRetry(
        `${X_API_BASE}/users/by/username/${encodeURIComponent(profile.x_username)}?user.fields=id`,
        { headers: xApiHeaders() }
      );

      if (!res.ok) {
        results.push({
          username: profile.x_username,
          synced: false,
          error: `X API ${res.status}`,
        });
        continue;
      }

      const json = await res.json();
      const xId = json.data?.id;
      if (!xId) {
        results.push({
          username: profile.x_username,
          synced: false,
          error: "Could not resolve X user ID",
        });
        continue;
      }

      await syncXDataToDrupal(undefined, xId, profile.x_username);
      results.push({ username: profile.x_username, synced: true });
    } catch (err: any) {
      results.push({
        username: profile.x_username,
        synced: false,
        error: err.message,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main agent
// ---------------------------------------------------------------------------

export async function runApiAgent(): Promise<ApiAgentReport> {
  const startTime = Date.now();
  const issues: string[] = [];

  const tokenChecks = await Promise.all([
    checkBearerToken(),
    checkXaiToken(),
    checkDrupalToken(),
  ]);

  for (const check of tokenChecks) {
    if (!check.valid) {
      issues.push(`CRITICAL: ${check.name} is invalid — ${check.error}`);
    } else if (check.latencyMs > 5000) {
      issues.push(`WARN: ${check.name} responded slowly (${check.latencyMs}ms)`);
    }
  }

  const rateLimits = await checkRateLimits();

  for (const rl of rateLimits) {
    if (rl.percentUsed !== null && rl.percentUsed > 80) {
      issues.push(
        `WARN: ${rl.endpoint} rate limit ${rl.percentUsed}% used (${rl.remaining}/${rl.limit} remaining, resets ${rl.resetsAt})`
      );
    }
  }

  let profileSyncs: ProfileSyncResult[] = [];
  let profiles: CreatorProfile[] = [];

  const bearerValid = tokenChecks.find(
    (c) => c.name === "X_API_BEARER_TOKEN"
  )?.valid;

  if (bearerValid) {
    try {
      profiles = await getAllCreatorProfiles();
      profileSyncs = await syncStaleProfiles(profiles);

      const failedSyncs = profileSyncs.filter((s) => !s.synced);
      if (failedSyncs.length > 0) {
        issues.push(
          `WARN: ${failedSyncs.length}/${profileSyncs.length} profile syncs failed`
        );
      }
    } catch (err: any) {
      issues.push(`WARN: Could not fetch profiles for sync: ${err.message}`);
    }
  }

  const criticalCount = issues.filter((i) => i.startsWith("CRITICAL")).length;
  const status: ApiAgentReport["status"] =
    criticalCount > 0
      ? "critical"
      : issues.length > 0
        ? "degraded"
        : "healthy";

  const report: ApiAgentReport = {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    tokenChecks,
    rateLimits,
    profileSyncs,
    totalProfiles: profiles.length,
    profilesSynced: profileSyncs.filter((s) => s.synced).length,
    issues,
    status,
  };

  if (status === "critical") {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: "[CRITICAL] API Agent — Token or Service Failure",
      html: `<pre>${JSON.stringify(report, null, 2)}</pre>`,
      text: `API Agent CRITICAL.\n\nIssues:\n${issues.join("\n")}`,
    }).catch(() => {});
  }

  return report;
}
