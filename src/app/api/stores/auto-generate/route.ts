import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getCreatorProfile } from "@/lib/drupal";
import { enhanceCreatorProfile, GrokEnhancements } from "@/lib/grok";
import { generateBackgroundWithContext, getCreatorXContext } from "@/lib/grok-imagine";
import { triggerDrupalSync } from "@/lib/drupal-sync";
import type { XImportData } from "@/lib/x-import";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json({ error: "Sign in with X first" }, { status: 401 });
  }

  const xUsername = token.xUsername as string;

  try {
    // 1. Ensure profile is fresh in Drupal
    await triggerDrupalSync(xUsername).catch(() => {});

    const profile = await getCreatorProfile(xUsername, { noStore: true });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 2. Build XImportData shape for Grok enhancement
    const xData: XImportData = {
      username: profile.x_username,
      displayName: profile.title || profile.x_username,
      bio: (profile.bio || "").replace(/<[^>]*>/g, ""),
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

    // 3. Get Grok AI enhancements (product suggestions, theme, bio)
    let grokEnhancements: GrokEnhancements | null = null;
    try {
      grokEnhancements = await enhanceCreatorProfile(xData);
    } catch (err) {
      console.error("[auto-generate] Grok enhancement failed:", err);
    }

    // 4. Generate background variants using creator context
    let backgroundVariants: string[] = [];
    try {
      const bgPrompt = grokEnhancements?.topThemes?.length
        ? `dark atmospheric background inspired by ${grokEnhancements.topThemes.slice(0, 3).join(", ")} content`
        : "dark elegant gradient background with subtle texture";
      const bgResult = await generateBackgroundWithContext(bgPrompt, xUsername, 4);
      backgroundVariants = bgResult.urls;
    } catch (err) {
      console.error("[auto-generate] Background generation failed:", err);
    }

    // 5. Get creator context for brand vibe summary
    const ctx = await getCreatorXContext(xUsername);

    return NextResponse.json({
      profile: {
        username: xData.username,
        displayName: xData.displayName,
        bio: xData.bio,
        pfpUrl: xData.profileImageUrl,
        bannerUrl: xData.bannerUrl,
        followerCount: xData.followerCount,
      },
      grokEnhancements,
      backgroundVariants,
      brandVibe: {
        bio: ctx?.bio || xData.bio,
        topThemes: ctx?.topThemes || xData.metrics.top_themes,
        recentPostsSummary: ctx?.recentPostsSummary || "",
      },
    });
  } catch (err: any) {
    console.error("[auto-generate] Failed:", err);
    return NextResponse.json(
      { error: err?.message || "Store auto-generation failed" },
      { status: 500 }
    );
  }
}
