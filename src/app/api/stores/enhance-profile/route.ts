import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getCreatorProfile } from "@/lib/drupal";
import { enhanceCreatorProfile } from "@/lib/grok";
import { triggerDrupalSync } from "@/lib/drupal-sync";

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json(
      { error: "Sign in with X first" },
      { status: 401 }
    );
  }

  const xUsername = token.xUsername as string;

  // Trigger Drupal to refresh X data first, then read it back.
  await triggerDrupalSync(xUsername).catch(() => {});

  const profile = await getCreatorProfile(xUsername, { noStore: true });
  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found in Drupal" },
      { status: 404 }
    );
  }

  // Build xData-like shape from Drupal profile for Grok
  const xData = {
    username: profile.x_username,
    displayName: profile.title || profile.x_username,
    bio: profile.bio?.replace(/<[^>]*>/g, "") || "",
    followerCount: profile.follower_count,
    profileImageUrl: profile.profile_picture_url,
    bannerUrl: profile.banner_url,
    verified: false,
    verifiedType: "none",
    topPosts: profile.top_posts.map((p) => ({
      id: p.id,
      text: p.text,
      likes: p.likes ?? 0,
      retweets: p.retweets ?? 0,
      replies: p.replies ?? 0,
      views: p.views ?? 0,
      date: p.date ?? "",
    })),
    topFollowers: profile.top_followers.map((f) => ({
      username: f.username,
      display_name: f.display_name,
      profile_image_url: f.profile_image_url,
      follower_count: f.follower_count,
      verified: f.verified ?? false,
    })),
    metrics: profile.metrics || {
      engagement_score: 0,
      avg_likes: 0,
      avg_retweets: 0,
      avg_views: 0,
      top_themes: [],
      recommended_products: [],
      posting_frequency: "Unknown",
      audience_sentiment: "Positive",
    },
  };

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
