import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/notifications";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type AgentStatus = "healthy" | "critical";

interface SiteGenerateAgentReport {
  timestamp: string;
  endpoint: string;
  durationMs: number;
  httpStatus: number | null;
  status: AgentStatus;
  issues: string[];
}

function resolveBaseUrl(): string {
  const fromNextAuth = process.env.NEXTAUTH_URL?.trim();
  if (fromNextAuth) return fromNextAuth.replace(/\/$/, "");

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN?.trim() || "rareimagery.net";
  return `https://${baseDomain}`;
}

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET (Vercel sends Authorization: Bearer <secret> for cron jobs)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const baseUrl = resolveBaseUrl();
  const endpoint = `${baseUrl}/api/site/generate`;
  const issues: string[] = [];

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(20000),
    });

    // Healthy: endpoint exists and enforces auth (401/403), or succeeds for configured service users.
    const healthyStatuses = new Set([200, 401, 403]);
    const isHealthy = healthyStatuses.has(response.status);

    if (!isHealthy) {
      issues.push(`Unexpected status from /api/site/generate: HTTP ${response.status}`);
    }

    const report: SiteGenerateAgentReport = {
      timestamp: new Date().toISOString(),
      endpoint,
      durationMs: Date.now() - started,
      httpStatus: response.status,
      status: isHealthy ? "healthy" : "critical",
      issues,
    };

    if (report.status === "critical") {
      const adminEmail = process.env.CONSOLE_ADMIN_EMAIL || "admin@rareimagery.net";
      await sendEmail({
        to: adminEmail,
        subject: "[CRITICAL] Site Generate Agent Check Failed",
        html: `<pre>${JSON.stringify(report, null, 2)}</pre>`,
        text: `Site generate check failed with HTTP ${response.status}.`,
      }).catch(() => {});
    }

    return NextResponse.json(report, {
      status: report.status === "critical" ? 503 : 200,
    });
  } catch (err: any) {
    const message = err?.message || "Unknown error";
    issues.push(`Request failed: ${message}`);

    const report: SiteGenerateAgentReport = {
      timestamp: new Date().toISOString(),
      endpoint,
      durationMs: Date.now() - started,
      httpStatus: null,
      status: "critical",
      issues,
    };

    const adminEmail = process.env.CONSOLE_ADMIN_EMAIL || "admin@rareimagery.net";
    await sendEmail({
      to: adminEmail,
      subject: "[CRITICAL] Site Generate Agent Unreachable",
      html: `<pre>${JSON.stringify(report, null, 2)}</pre>`,
      text: `Site generate check request failed: ${message}`,
    }).catch(() => {});

    return NextResponse.json(report, { status: 503 });
  }
}