import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { fetchXData } from "@/lib/x-import";
import { enhanceCreatorProfile } from "@/lib/grok";

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json(
      { error: "Sign in with X first" },
      { status: 401 }
    );
  }

  const xAccessToken = token.xAccessToken as string | undefined;
  const xId = token.xId as string | undefined;

  if (!xAccessToken || !xId) {
    return NextResponse.json(
      { error: "Missing X credentials — please sign in again" },
      { status: 400 }
    );
  }

  // 1. Fetch raw X data
  let xData;
  try {
    xData = await fetchXData(xAccessToken, xId);
  } catch (err: any) {
    console.error("X data fetch failed:", err);
    return NextResponse.json(
      { error: `Failed to fetch X profile: ${err.message}` },
      { status: 502 }
    );
  }

  // 2. Enhance with Grok AI (non-blocking — returns null on failure)
  let grokEnhancements = null;
  try {
    grokEnhancements = await enhanceCreatorProfile(xData);
  } catch (err) {
    console.error("Grok enhancement failed (non-critical):", err);
  }

  return NextResponse.json({
    xData,
    grokEnhancements,
  });
}
