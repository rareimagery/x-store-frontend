import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRequiredPaidSubscription } from "@/lib/x-subscription";
import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import {
  fetchXData,
  patchProfile,
  findProfileByUsername,
  uploadImageToDrupal,
  createImportSnapshot,
  updateImportSnapshot,
} from "@/lib/x-import";
import type { XImportData } from "@/lib/x-import";
import { generateCreatorSite } from "@/lib/ai/generate-site";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { ensureStoreSubdomainDns } from "@/lib/cloudflare";
import { randomUUID } from "crypto";

const DRUPAL_API = process.env.DRUPAL_API_URL;

async function profileExists(username: string): Promise<string | null> {
  const res = await fetch(
    `${DRUPAL_API}/jsonapi/node/x_user_profile?filter[field_x_username]=${username}`,
    { headers: { ...drupalAuthHeaders() } }
  );
  if (!res.ok) return null;
  const json = await res.json();
  if (json.data?.length > 0) return json.data[0].id;
  return null;
}

async function createProfile(
  username: string,
  xId: string,
  xData?: XImportData
): Promise<{ id: string }> {
  const writeHeaders = await drupalWriteHeaders();

  const attributes: Record<string, any> = {
    title: `${username} X Profile`,
    field_x_username: username,
    field_store_theme: "xai3",
  };

  if (xData) {
    if (xData.bio) {
      attributes.field_bio_description = { value: xData.bio, format: "basic_html" };
    }
    if (xData.followerCount) {
      attributes.field_follower_count = xData.followerCount;
    }
    if (xData.topPosts.length) {
      attributes.field_top_posts = xData.topPosts.map((p) => JSON.stringify(p));
    }
    if (xData.topFollowers.length) {
      attributes.field_top_followers = xData.topFollowers.map((f) => JSON.stringify(f));
    }
    attributes.field_metrics = JSON.stringify(xData.metrics);
  }

  const res = await fetch(`${DRUPAL_API}/jsonapi/node/x_user_profile`, {
    method: "POST",
    headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify({
      data: { type: "node--x_user_profile", attributes },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create profile: ${text}`);
  }

  const json = await res.json();
  return { id: json.data.id };
}

const provisionLimit = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 }); // 5/hour

async function provisionStoreDns(slug: string) {
  try {
    const dns = await ensureStoreSubdomainDns(slug);
    if (!dns.configured) {
      console.log(`[cloudflare] DNS automation skipped for ${dns.hostname}`);
    }
  } catch (error) {
    console.error(`[cloudflare] DNS automation failed for ${slug}:`, error);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const agreedToTerms = Boolean(body?.agreedToTerms);

  if (!agreedToTerms) {
    return NextResponse.json(
      { error: "You must agree to the Terms of Service, EULA, and Privacy Policy" },
      { status: 400 }
    );
  }

  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json(
      { error: "Sign in with X first" },
      { status: 401 }
    );
  }

  const userId = (token.xId as string) || (token.sub as string) || "anon";
  const rl = provisionLimit(userId);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const xUsername = token.xUsername as string;
  const xId = token.xId as string;
  const xAccessToken = token.xAccessToken as string;
  const importRunId = randomUUID();
  const snapshotUuid = await createImportSnapshot({
    xUsername,
    xUserId: xId,
    runId: importRunId,
    status: "pending",
  });

  if (!xUsername || !xId) {
    return NextResponse.json(
      { error: "Missing X account info — please sign in again" },
      { status: 400 }
    );
  }

  // Check if profile already exists
  const existingId = await profileExists(xUsername);
  if (existingId) {
    await provisionStoreDns(xUsername);
    if (snapshotUuid) {
      await updateImportSnapshot(snapshotUuid, {
        status: "success",
        profileUuid: existingId,
      });
    }
    return NextResponse.json({
      success: true,
      profileId: existingId,
      alreadyExisted: true,
      url: `https://${xUsername}.${process.env.NEXT_PUBLIC_BASE_DOMAIN}`,
    });
  }

  {
    const { subscribed, error } = await checkRequiredPaidSubscription({
      buyerXId: xId,
      buyerUsername: xUsername,
    });
    if (!subscribed) {
      if (snapshotUuid) {
        await updateImportSnapshot(snapshotUuid, {
          status: "failed",
          errorMessage:
            error ||
            "An active paid X subscription is required to create your RareImagery account.",
        });
      }
      return NextResponse.json(
        {
          error: error || "An active paid X subscription is required to create your RareImagery account.",
          requiresPaidSubscription: true,
        },
        { status: 403 }
      );
    }
  }

  try {
    // Stage-first: fetch X data before writing any Drupal entities.
    // Non-fatal — if X API is unavailable we create a minimal profile.
    let xData: XImportData | undefined;
    if (xAccessToken) {
      try {
        xData = await fetchXData(xAccessToken, xId);
        // Store the staged X data in the snapshot payload
        if (snapshotUuid) {
          await updateImportSnapshot(snapshotUuid, {
            payload: {
              username: xData.username,
              followerCount: xData.followerCount,
              postsCount: xData.topPosts.length,
              bio: xData.bio,
              staged: true,
            },
          });
        }
      } catch (err: any) {
        console.warn(
          `[provision] X data prefetch failed for @${xUsername} — creating minimal profile:`,
          err.message
        );
      }
    }

    // Create profile node, pre-populated with staged X data when available
    const profile = await createProfile(xUsername, xId, xData);
    await provisionStoreDns(xUsername);

    if (snapshotUuid) {
      await updateImportSnapshot(snapshotUuid, {
        status: "success",
        profileUuid: profile.id,
        ...(xData && {
          payload: {
            username: xData.username,
            followerCount: xData.followerCount,
            postsImported: xData.topPosts.length,
            topFollowersImported: xData.topFollowers.length,
            engagementScore: xData.metrics.engagement_score,
            verified: xData.verified,
          },
        }),
      });
    }

    // Async: upload profile images (non-blocking)
    if (xData) {
      const profileId = profile.id;
      if (xData.profileImageUrl) {
        uploadImageToDrupal(xData.profileImageUrl, profileId, "field_profile_picture", `${xUsername}-pfp`)
          .catch((e) => console.error(`[provision] pfp upload failed:`, e));
      }
      if (xData.bannerUrl) {
        uploadImageToDrupal(xData.bannerUrl, profileId, "field_background_banner", `${xUsername}-banner`)
          .catch((e) => console.error(`[provision] banner upload failed:`, e));
      }
    }

    // Async: AI site generation using already-fetched xData — non-blocking
    if (xData) {
      const stagedXData = xData;
      (async () => {
        try {
          const result = await generateCreatorSite(stagedXData);
          const profileNode = await findProfileByUsername(xUsername);
          if (profileNode) {
            await patchProfile(profileNode.uuid, {
              field_store_theme: result.grokAnalysis.suggestedThemePreset || "xai3",
              field_bio_description: {
                value: result.grokAnalysis.rewrittenBio,
                format: "basic_html",
              },
              field_metrics: JSON.stringify({
                ai_site: {
                  version: 1,
                  generatedAt: result.generatedAt,
                  grokAnalysis: result.grokAnalysis,
                  components: result.components,
                },
              }),
            });
            console.log(`[provision] AI site generated for @${xUsername}`);
          }
        } catch (err) {
          console.error(`[provision] AI site generation failed for @${xUsername}:`, err);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      profileId: profile.id,
      alreadyExisted: false,
      url: `https://${xUsername}.${process.env.NEXT_PUBLIC_BASE_DOMAIN}`,
    });
  } catch (err: any) {
    if (snapshotUuid) {
      await updateImportSnapshot(snapshotUuid, {
        status: "failed",
        errorMessage: err?.message || "Provision failed",
      });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
