// ---------------------------------------------------------------------------
// POST /api/site/generate — Dual-AI site generation orchestrator
// Grok (profile analysis) → Grok (component generation)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { findProfileByUsername, patchProfile } from "@/lib/x-import";
import { getCreatorProfile } from "@/lib/drupal";
import { triggerDrupalSync } from "@/lib/drupal-sync";
import { generateCreatorSite } from "@/lib/ai/generate-site";
import { getBuilds, saveBuilds } from "@/lib/drupalBuilds";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { randomUUID } from "crypto";

const generateLimit = createRateLimiter({ limit: 3, windowMs: 60 * 60 * 1000 }); // 3/hour

export async function POST(req: NextRequest) {
  const token = await getToken({ req });

  if (!token || !token.xUsername) {
    return NextResponse.json(
      { error: "Sign in with X first" },
      { status: 401 }
    );
  }

  const userId = (token.xId as string) || (token.sub as string) || "anon";
  const rl = generateLimit(userId);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const xUsername = token.xUsername as string;

  try {
    // 1. Ensure Drupal has fresh X data, then read it back
    await triggerDrupalSync(xUsername).catch(() => {});
    const profile = await getCreatorProfile(xUsername, { noStore: true });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const xData = {
      username: profile.x_username,
      displayName: profile.title || profile.x_username,
      bio: profile.bio?.replace(/<[^>]*>/g, "") || "",
      followerCount: profile.follower_count,
      profileImageUrl: profile.profile_picture_url,
      bannerUrl: profile.banner_url,
      verified: false,
      verifiedType: "none" as const,
      topPosts: profile.top_posts.map((p) => ({
        id: p.id, text: p.text, likes: p.likes ?? 0, retweets: p.retweets ?? 0,
        replies: p.replies ?? 0, views: p.views ?? 0, date: p.date ?? "",
      })),
      topFollowers: profile.top_followers.map((f) => ({
        username: f.username, display_name: f.display_name,
        profile_image_url: f.profile_image_url, follower_count: f.follower_count,
        verified: f.verified ?? false,
      })),
      metrics: profile.metrics || {
        engagement_score: 0, avg_likes: 0, avg_retweets: 0, avg_views: 0,
        top_themes: [] as string[], recommended_products: [] as string[],
        posting_frequency: "Unknown", audience_sentiment: "Positive",
      },
    };

    // 2. Run dual-AI pipeline (Grok → Haiku)
    const result = await generateCreatorSite(xData);

    // 3. Store generation result on the creator profile
    const profileNode = await findProfileByUsername(xUsername);
    if (profileNode) {
      await patchProfile(profileNode.uuid, {
        field_metrics: JSON.stringify({
          ...JSON.parse("{}"), // merge with existing if needed
          ai_site: {
            version: 1,
            generatedAt: result.generatedAt,
            grokAnalysis: result.grokAnalysis,
            themeOverrides: result.components.themeOverrides,
            layoutConfig: result.components.layoutConfig,
            customCSS: result.components.customCSS,
          },
        }),
      });

      // 4. Save hero + about as published builds (if commerce store exists)
      try {
        const existingBuilds = await getBuilds(xUsername);
        const newBuilds = [
          {
            id: randomUUID(),
            label: "AI Hero Section",
            code: result.components.heroSection,
            createdAt: result.generatedAt,
            published: true,
          },
          {
            id: randomUUID(),
            label: "AI About Section",
            code: result.components.aboutSection,
            createdAt: result.generatedAt,
            published: true,
          },
        ];

        // Prepend AI builds, keeping existing ones
        const merged = [...newBuilds, ...existingBuilds];
        await saveBuilds(xUsername, merged.slice(0, 20));
      } catch {
        // Commerce store may not exist yet — that's fine
        console.log(
          `[site-gen] Could not save builds for @${xUsername} (no commerce store yet)`
        );
      }

      // 5. Apply Grok's theme recommendation to profile
      const resolvedTheme = result.grokAnalysis.suggestedThemePreset;
      if (resolvedTheme) {
        await patchProfile(profileNode.uuid, {
          field_store_theme: resolvedTheme,
          field_bio_description: {
            value: result.grokAnalysis.rewrittenBio,
            format: "basic_html",
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      generatedAt: result.generatedAt,
      theme: result.grokAnalysis.suggestedThemePreset,
      category: result.grokAnalysis.suggestedCategory,
      bio: result.grokAnalysis.rewrittenBio,
      components: {
        heroSection: result.components.heroSection,
        aboutSection: result.components.aboutSection,
        layoutConfig: result.components.layoutConfig,
        themeOverrides: result.components.themeOverrides,
      },
    });
  } catch (err: unknown) {
    console.error(`[site-gen] Failed for @${xUsername}:`, err);
    const message = err instanceof Error ? err.message : "Site generation failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
