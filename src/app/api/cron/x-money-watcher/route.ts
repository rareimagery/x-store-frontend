import { NextRequest, NextResponse } from "next/server";
import { runXMoneyWatcherAgent } from "@/lib/x-money-watcher-agent";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await runXMoneyWatcherAgent();

  // 202 = still waiting, 200 = detected or active
  const httpStatus = report.status === "waiting" ? 202 : 200;

  return NextResponse.json(report, { status: httpStatus });
}
