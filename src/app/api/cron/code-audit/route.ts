import { NextRequest, NextResponse } from "next/server";
import { runCodeAuditAgent } from "@/lib/code-audit-agent";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/code-audit
 * Runs every 8 hours via Vercel cron. Validates all connections between
 * Next.js, Drupal, X API, Grok, Stripe, and environment configuration.
 * Sends alert email on critical failures.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await runCodeAuditAgent();

  return NextResponse.json(report, {
    status: report.status === "critical" ? 503 : 200,
  });
}
