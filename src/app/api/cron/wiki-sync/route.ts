import { NextRequest, NextResponse } from "next/server";
import { runWikiSyncAgent } from "@/lib/wiki-sync-agent";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/wiki-sync
 * Runs every 8 hours via Vercel cron. Scans for stale content in
 * the /howto guide and auto-corrects outdated URLs, pricing, and
 * feature references.
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

  const report = await runWikiSyncAgent();

  return NextResponse.json(report, {
    status: report.status === "error" ? 503 : 200,
  });
}
