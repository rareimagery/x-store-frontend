// ---------------------------------------------------------------------------
// GET /api/console/insights
// Returns the authenticated creator's full X metrics and AI analysis
// stored in Drupal — cached 60s, no external API calls.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getCreatorProfile } from "@/lib/drupal";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const xUsername =
    ((token.xUsername as string) ||
      (token.storeSlug as string) ||
      null) as string | null;

  if (!xUsername) {
    return NextResponse.json(
      { error: "No X username associated with this session" },
      { status: 400 }
    );
  }

  const profile = await getCreatorProfile(xUsername);
  if (!profile) {
    return NextResponse.json(
      { error: "Creator profile not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      xUsername: profile.x_username,
      followerCount: profile.follower_count,
      bio: profile.bio,
      profilePictureUrl: profile.profile_picture_url,
      bannerUrl: profile.banner_url,
      metrics: profile.metrics,
      topPosts: profile.top_posts ?? [],
      topFollowers: profile.top_followers ?? [],
      storeTheme: profile.store_theme,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    }
  );
}
