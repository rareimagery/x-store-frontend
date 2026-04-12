import { NextRequest, NextResponse } from "next/server";
import { runDocsUpdateAgent } from "@/lib/wiki-docs-agent";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/docs-update
 * Runs every 12 hours. Scans codebase changes, uses Grok AI to
 * rewrite the public wiki (/full/wiki) and howto guide (/howto).
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

  const report = await runDocsUpdateAgent();

  return NextResponse.json(report, {
    status: report.status === "error" ? 503 : 200,
  });
}
