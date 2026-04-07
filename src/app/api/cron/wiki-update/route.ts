import { NextRequest, NextResponse } from "next/server";
import { runWikiUpdateAgent } from "@/lib/wiki-update-agent";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/wiki-update
 * Runs every 2 hours. Probes the live site for changes, queries Drupal
 * for current stats, and rebuilds the admin wiki with fresh data.
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

  const report = await runWikiUpdateAgent();

  return NextResponse.json(report, {
    status: report.status === "error" ? 503 : 200,
  });
}
