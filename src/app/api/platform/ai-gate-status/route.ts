import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkAiGate, FREE_LIFETIME_LIMIT } from "@/lib/ai-gate";

/**
 * GET /api/platform/ai-gate-status
 * Returns the platform AI gate status for the authenticated creator.
 * Used by the Design Studio and Background Generator to show/hide the gate.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storeSlug = (token.storeSlug as string) || (token.xUsername as string) || "";
  const xUsername = token.xUsername as string;
  const gate = await checkAiGate(storeSlug, xUsername);

  return NextResponse.json({
    totalGenerations: gate.totalGenerations,
    limit: FREE_LIFETIME_LIMIT,
    remaining: Math.max(FREE_LIFETIME_LIMIT - gate.totalGenerations, 0),
    limitReached: gate.limitReached,
    platformSubscribed: gate.platformSubscribed,
    canGenerate: gate.canGenerate,
    subscribeUrl: "https://x.com/rareimagery/subscribe",
  });
}
