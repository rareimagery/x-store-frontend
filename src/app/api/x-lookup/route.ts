import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

// Fetch X user profile via Drupal's x_profile_sync lookup endpoint.
// Falls back to calling X API directly if Drupal endpoint is unreachable.
async function lookupViaX(username: string): Promise<any | null> {
  const bearerToken = process.env.X_API_BEARER_TOKEN;
  if (!bearerToken) return null;

  const fields = "id,name,username,description,profile_image_url,public_metrics,verified_type";
  const res = await fetch(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=${fields}`,
    {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) return null;
  const json = await res.json();
  const user = json.data;
  if (!user) return null;

  const pm = user.public_metrics ?? {};
  let avatarUrl = user.profile_image_url ?? null;
  if (avatarUrl) avatarUrl = avatarUrl.replace("_normal", "_400x400");

  return {
    username: user.username ?? username,
    display_name: user.name ?? username,
    bio: user.description ?? "",
    profile_image_url: avatarUrl,
    follower_count: pm.followers_count ?? 0,
    verified: (user.verified_type ?? "none") !== "none",
  };
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  // Try Drupal endpoint first
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/api/x-profile-sync/lookup?username=${encodeURIComponent(username)}`,
      { headers: drupalAuthHeaders(), cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
  } catch {
    // Drupal endpoint unreachable — fall through to direct X API
  }

  // Fallback: call X API directly
  const result = await lookupViaX(username);
  if (!result) {
    return NextResponse.json({ error: `User @${username} not found` }, { status: 404 });
  }

  return NextResponse.json(result);
}
