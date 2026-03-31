// ---------------------------------------------------------------------------
// API Agent — monitors token health and triggers Drupal-side X data sync
// ---------------------------------------------------------------------------

import { X_API_BASE, xApiHeaders } from "@/lib/x-api/client";
import { DRUPAL_API_URL } from "@/lib/drupal";
import { triggerDrupalBatchSync } from "@/lib/drupal-sync";
import { sendEmail } from "@/lib/notifications";

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

// ---------------------------------------------------------------------------
// Token health checks
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
    return { name: "XAI_API_KEY", valid: false, error: "Not configured", latencyMs: 0 };
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
    return { name: "XAI_API_KEY", valid: false, error: err.message, latencyMs: Date.now() - start };
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
    return { name: "DRUPAL_API (Basic Auth)", valid: false, error: err.message, latencyMs: Date.now() - start };
  }
}

// ---------------------------------------------------------------------------
// Main agent — health checks + tell Drupal to batch-sync profiles
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

  // Trigger Drupal-side batch sync (Drupal owns X API calls).
  let profileSyncs: ProfileSyncResult[] = [];
  const drupalValid = tokenChecks.find((c) => c.name === "DRUPAL_API (Basic Auth)")?.valid;

  if (drupalValid) {
    try {
      const syncResult = await triggerDrupalBatchSync(5);
      profileSyncs = (syncResult.results || []).map((r) => ({
        username: r.username,
        synced: r.status === "success",
        error: r.error ?? undefined,
      }));

      if (syncResult.failed > 0) {
        issues.push(`WARN: ${syncResult.failed}/${syncResult.results.length} profile syncs failed`);
      }
    } catch (err: any) {
      issues.push(`WARN: Drupal batch sync trigger failed: ${err.message}`);
    }
  }

  const criticalCount = issues.filter((i) => i.startsWith("CRITICAL")).length;
  const status: ApiAgentReport["status"] =
    criticalCount > 0 ? "critical" : issues.length > 0 ? "degraded" : "healthy";

  const report: ApiAgentReport = {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    tokenChecks,
    rateLimits: [],
    profileSyncs,
    totalProfiles: profileSyncs.length,
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
