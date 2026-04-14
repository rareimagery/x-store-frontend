import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { fetchXProfile } from "@/lib/x-api";

const X_API_BASE = "https://api.x.com/2";
const BEARER = process.env.X_API_BEARER_TOKEN || "";

/**
 * POST /api/stores/verify-follow
 * Verify if the authenticated user follows a target X account.
 * Uses Bearer Token to look up the target's followers and check for the visitor.
 * Body: { targetUsername: string }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { targetUsername } = await req.json();
  if (!targetUsername) {
    return NextResponse.json({ error: "targetUsername required" }, { status: 400 });
  }

  const visitorUsername = (token.xUsername as string).toLowerCase();

  if (!BEARER) {
    // Can't verify — accept the claim on honor
    return NextResponse.json({ verified: false, reason: "no_bearer_token", honor: true });
  }

  try {
    // Look up target user ID
    const targetProfile = await fetchXProfile(targetUsername);
    if (!targetProfile?.data?.id) {
      return NextResponse.json({ verified: false, reason: "target_not_found" });
    }

    // Check recent followers of the target for the visitor
    // X API: GET /2/users/{id}/followers — returns up to 1000
    const res = await fetch(
      `${X_API_BASE}/users/${targetProfile.data.id}/followers?max_results=1000&user.fields=username`,
      { headers: { Authorization: `Bearer ${BEARER}` }, cache: "no-store" }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Rate limited or auth issue — accept on honor
      return NextResponse.json({
        verified: false,
        reason: res.status === 429 ? "rate_limited" : `api_error_${res.status}`,
        honor: true,
        detail: err.detail || err.title,
      });
    }

    const data = await res.json();
    const followers = data.data || [];
    const isFollowing = followers.some(
      (f: any) => f.username?.toLowerCase() === visitorUsername
    );

    return NextResponse.json({
      verified: isFollowing,
      reason: isFollowing ? "follow_confirmed" : "not_following",
      followersChecked: followers.length,
    });
  } catch (err: any) {
    return NextResponse.json({
      verified: false,
      reason: "error",
      honor: true,
      detail: err.message,
    });
  }
}
