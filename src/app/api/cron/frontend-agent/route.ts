import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/frontend-agent";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET (cron sends Authorization: Bearer <secret> for cron jobs)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await runAgent();

  return NextResponse.json(report, {
    status: report.status === "critical" ? 503 : 200,
  });
}
