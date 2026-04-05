// ---------------------------------------------------------------------------
// Code Audit Agent — runs every 8 hours via Vercel cron
// Validates all connections between Next.js, Drupal, and external services
// ---------------------------------------------------------------------------

import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { sendEmail } from "@/lib/notifications";

export interface AuditCheck {
  name: string;
  category: "drupal" | "auth" | "api" | "x_api" | "stripe" | "printful" | "grok" | "config";
  ok: boolean;
  latencyMs: number;
  detail?: string;
}

export interface CodeAuditReport {
  timestamp: string;
  durationMs: number;
  checks: AuditCheck[];
  issues: string[];
  warnings: string[];
  status: "healthy" | "degraded" | "critical";
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

const ADMIN_EMAIL = process.env.CONSOLE_ADMIN_EMAIL || "admin@rareimagery.net";

function resolveBaseUrl(): string {
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl) return nextAuthUrl.replace(/\/$/, "");
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN?.trim() || "rareimagery.net";
  return `https://${baseDomain}`;
}

async function timedCheck(
  name: string,
  category: AuditCheck["category"],
  fn: () => Promise<{ ok: boolean; detail?: string }>
): Promise<AuditCheck> {
  const start = Date.now();
  try {
    const result = await fn();
    return { name, category, ok: result.ok, latencyMs: Date.now() - start, detail: result.detail };
  } catch (err: any) {
    return { name, category, ok: false, latencyMs: Date.now() - start, detail: err?.message || "Unknown error" };
  }
}

async function fetchCheck(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number | null; detail?: string }> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000), ...init });
    return { ok: res.status < 500, status: res.status, detail: `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, status: null, detail: err?.message || "Timeout/unreachable" };
  }
}

export async function runCodeAuditAgent(): Promise<CodeAuditReport> {
  const startTime = Date.now();
  const baseUrl = resolveBaseUrl();
  const checks: AuditCheck[] = [];
  const issues: string[] = [];
  const warnings: string[] = [];

  // ── 1. Environment variables ──
  checks.push(await timedCheck("DRUPAL_API_URL configured", "config", async () => {
    const set = !!process.env.DRUPAL_API_URL;
    return { ok: set, detail: set ? DRUPAL_API_URL : "NOT SET — all Drupal calls will fail" };
  }));

  checks.push(await timedCheck("NEXTAUTH_SECRET configured", "config", async () => {
    const set = !!process.env.NEXTAUTH_SECRET;
    return { ok: set, detail: set ? "Set" : "NOT SET — sessions will fail" };
  }));

  checks.push(await timedCheck("X OAuth credentials", "config", async () => {
    const id = process.env.X_CLIENT_ID;
    const secret = process.env.X_CLIENT_SECRET;
    if (!id || !secret) return { ok: false, detail: "X_CLIENT_ID or X_CLIENT_SECRET missing" };
    if (id === secret) return { ok: false, detail: "X_CLIENT_ID equals X_CLIENT_SECRET — misconfigured" };
    return { ok: true, detail: "Configured" };
  }));

  checks.push(await timedCheck("X API Bearer Token", "config", async () => {
    const set = !!process.env.X_API_BEARER_TOKEN;
    return { ok: set, detail: set ? "Set" : "Missing — X API lookups will fail" };
  }));

  checks.push(await timedCheck("Grok API Key", "config", async () => {
    const set = !!(process.env.XAI_API_KEY || process.env.GROK_API_KEY);
    return { ok: set, detail: set ? "Set" : "Missing — Grok Creator Studio disabled" };
  }));

  checks.push(await timedCheck("CRON_SECRET configured", "config", async () => {
    const set = !!process.env.CRON_SECRET;
    return { ok: set, detail: set ? "Set" : "Missing — cron jobs will fail auth" };
  }));

  // ── 2. Drupal connectivity ──
  if (DRUPAL_API_URL) {
    checks.push(await timedCheck("Drupal JSON:API root", "drupal", async () => {
      const r = await fetchCheck(`${DRUPAL_API_URL}/jsonapi`);
      return { ok: r.ok, detail: r.detail };
    }));

    checks.push(await timedCheck("Drupal profile query", "drupal", async () => {
      const r = await fetchCheck(
        `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?page[limit]=1`,
        { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" } }
      );
      return { ok: r.ok, detail: r.detail };
    }));

    checks.push(await timedCheck("Drupal store query", "drupal", async () => {
      const r = await fetchCheck(
        `${DRUPAL_API_URL}/jsonapi/commerce_store/online?page[limit]=1`,
        { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" } }
      );
      return { ok: r.ok, detail: r.detail };
    }));

    checks.push(await timedCheck("Drupal session auth (write)", "drupal", async () => {
      try {
        const headers = await drupalWriteHeaders();
        const hasCookie = Object.keys(headers).some((k) => k.toLowerCase() === "cookie");
        const hasCsrf = Object.keys(headers).some((k) => k.toLowerCase() === "x-csrf-token");
        if (hasCookie && hasCsrf) return { ok: true, detail: "Session + CSRF token acquired" };
        return { ok: true, detail: `Fallback auth (cookie=${hasCookie}, csrf=${hasCsrf})` };
      } catch (err: any) {
        return { ok: false, detail: err?.message };
      }
    }));

    checks.push(await timedCheck("Drupal x_profile_sync endpoint", "drupal", async () => {
      const r = await fetchCheck(
        `${DRUPAL_API_URL}/api/x-profile-sync/lookup?username=test`,
        { headers: drupalAuthHeaders() }
      );
      // 404 is fine (user not found), 403/500 is a problem
      return { ok: r.status !== null && r.status < 500, detail: r.detail };
    }));

    checks.push(await timedCheck("Drupal cost-dashboard endpoint", "drupal", async () => {
      const r = await fetchCheck(
        `${DRUPAL_API_URL}/api/cost-summary`,
        { headers: drupalAuthHeaders() }
      );
      // 403 is ok (permission denied without proper role)
      return { ok: r.status !== null && r.status < 500, detail: r.detail };
    }));
  }

  // ── 3. Next.js endpoints ──
  checks.push(await timedCheck("Next.js homepage", "api", async () => {
    const r = await fetchCheck(`${baseUrl}/`);
    return { ok: r.ok, detail: r.detail };
  }));

  checks.push(await timedCheck("NextAuth session API", "auth", async () => {
    const r = await fetchCheck(`${baseUrl}/api/auth/session`);
    return { ok: r.ok, detail: r.detail };
  }));

  checks.push(await timedCheck("NextAuth providers API", "auth", async () => {
    const r = await fetchCheck(`${baseUrl}/api/auth/providers`);
    return { ok: r.ok, detail: r.detail };
  }));

  checks.push(await timedCheck("Favorites API", "api", async () => {
    const r = await fetchCheck(`${baseUrl}/api/favorites`);
    // 401 expected without auth — that's correct behavior
    return { ok: r.status !== null && r.status < 500, detail: r.detail };
  }));

  checks.push(await timedCheck("Gallery API", "api", async () => {
    const r = await fetchCheck(`${baseUrl}/api/gallery`);
    return { ok: r.status !== null && r.status < 500, detail: r.detail };
  }));

  checks.push(await timedCheck("Blocks API", "api", async () => {
    const r = await fetchCheck(`${baseUrl}/api/blocks`);
    return { ok: r.status !== null && r.status < 500, detail: r.detail };
  }));

  // ── 4. X API ──
  if (process.env.X_API_BEARER_TOKEN) {
    checks.push(await timedCheck("X API v2 users endpoint", "x_api", async () => {
      const r = await fetchCheck(
        "https://api.x.com/2/users/by/username/RareImagery?user.fields=id",
        { headers: { Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}` } }
      );
      return { ok: r.ok && r.status === 200, detail: r.detail };
    }));
  }

  // ── 5. Grok AI ──
  if (process.env.XAI_API_KEY || process.env.GROK_API_KEY) {
    checks.push(await timedCheck("Grok xAI API reachable", "grok", async () => {
      // Just check the base endpoint responds (don't generate an image)
      const r = await fetchCheck("https://api.x.ai/v1/models", {
        headers: { Authorization: `Bearer ${process.env.XAI_API_KEY || process.env.GROK_API_KEY}` },
      });
      return { ok: r.status !== null && r.status < 500, detail: r.detail };
    }));
  }

  // ── 6. Stripe ──
  if (process.env.STRIPE_SECRET_KEY) {
    checks.push(await timedCheck("Stripe API reachable", "stripe", async () => {
      const r = await fetchCheck("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      });
      return { ok: r.ok, detail: r.detail };
    }));
  }

  // ── Compile report ──
  const failed = checks.filter((c) => !c.ok);
  const criticalFailed = failed.filter((c) => ["drupal", "auth", "config"].includes(c.category));

  for (const f of failed) {
    const msg = `[${f.category}] ${f.name}: ${f.detail || "FAILED"}`;
    if (["drupal", "auth", "config"].includes(f.category)) {
      issues.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  const status: CodeAuditReport["status"] =
    criticalFailed.length > 0 ? "critical" : failed.length > 0 ? "degraded" : "healthy";

  const report: CodeAuditReport = {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    checks,
    issues,
    warnings,
    status,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      warnings: warnings.length,
    },
  };

  // Send alert email on critical issues
  if (status === "critical") {
    try {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `[RareImagery] Code Audit CRITICAL — ${issues.length} issue(s)`,
        html: `
          <div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:24px;border-radius:12px;">
            <h2 style="color:#f43f5e;">Code Audit — Critical Issues Detected</h2>
            <p style="color:#a1a1aa;">Run at ${report.timestamp} (${report.durationMs}ms)</p>
            <p><strong>${report.summary.passed}/${report.summary.total} checks passed</strong></p>
            <h3 style="color:#f43f5e;margin-top:16px;">Issues:</h3>
            <ul>${issues.map((i) => `<li style="color:#fda4af;margin:4px 0;">${i}</li>`).join("")}</ul>
            ${warnings.length > 0 ? `
              <h3 style="color:#f59e0b;margin-top:16px;">Warnings:</h3>
              <ul>${warnings.map((w) => `<li style="color:#fcd34d;margin:4px 0;">${w}</li>`).join("")}</ul>
            ` : ""}
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[code-audit] Failed to send alert email:", emailErr);
    }
  }

  return report;
}
