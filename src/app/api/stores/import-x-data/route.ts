import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getToken } from "next-auth/jwt";
import {
  fetchXData,
  findProfileByUsername,
  patchProfile,
  uploadImageToDrupal,
  getProfileMediaFieldState,
  getDrupalFileAssetUrl,
  createImportSnapshot,
  updateImportSnapshot,
  findLatestSnapshot,
} from "@/lib/x-import";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// POST /api/stores/import-x-data
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Authenticate via NextAuth JWT
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json(
      { error: "Sign in with X first" },
      { status: 401 }
    );
  }

  const xAccessToken = token.xAccessToken as string | undefined;
  const xId = token.xId as string | undefined;
  const xUsername = token.xUsername as string | undefined;

  if (!xAccessToken || !xId || !xUsername) {
    return NextResponse.json(
      { error: "Missing X credentials in session — please sign in again" },
      { status: 400 }
    );
  }

  // 2. Idempotency: reject if an import is already in-flight for this account
  const pendingSnapshot = await findLatestSnapshot(xUsername, "pending");
  if (pendingSnapshot) {
    return NextResponse.json(
      { error: "An X data import is already in progress for this account. Please wait and try again." },
      { status: 409 }
    );
  }

  // 3. Find the creator profile node in Drupal
  const profile = await findProfileByUsername(xUsername);
  const importRunId = randomUUID();
  const snapshotUuid = await createImportSnapshot({
    xUsername,
    xUserId: xId,
    runId: importRunId,
    status: "pending",
    profileUuid: profile?.uuid,
  });

  if (!profile) {
    if (snapshotUuid) {
      await updateImportSnapshot(snapshotUuid, {
        status: "failed",
        errorMessage: "No Creator X Profile found for this account.",
      });
    }
    return NextResponse.json(
      {
        error:
          "No Creator X Profile found for this account. Provision your page first.",
      },
      { status: 404 }
    );
  }

  // 4. Fetch data from X API
  let xData;
  try {
    xData = await fetchXData(xAccessToken, xId);
  } catch (err: any) {
    console.error("X data import failed:", err);
    const rawMessage = err instanceof Error ? err.message : String(err);
    const isAuthFailure = /\b401\b/.test(rawMessage) || err?.status === 401;
    if (snapshotUuid) {
      await updateImportSnapshot(snapshotUuid, {
        status: "failed",
        errorMessage: rawMessage,
      });
    }
    return NextResponse.json(
      {
        error: isAuthFailure
          ? "X authorization expired. Please reconnect your X account (log out/in with X) and try sync again."
          : `Failed to fetch X data: ${rawMessage}`,
      },
      { status: isAuthFailure ? 401 : 502 }
    );
  }

  // 5. Build Drupal PATCH payload
  const topPostsJson = xData.topPosts.slice(0, 8).map((p) => JSON.stringify(p));
  const topFollowersJson = xData.topFollowers.slice(0, 8).map((f) => JSON.stringify(f));
  const metricsJson = JSON.stringify(xData.metrics);

  const attributes: Record<string, any> = {
    field_follower_count: xData.followerCount,
    field_bio_description: {
      value: xData.bio,
      format: "basic_html",
    },
    field_top_posts: topPostsJson,
    field_top_followers: topFollowersJson,
    field_metrics: metricsJson,
  };

  let profilePatchWarning: string | null = null;

  // 6. PATCH the Drupal node (text fields)
  try {
    await patchProfile(profile.uuid, attributes);
  } catch (err: any) {
    console.error("Drupal PATCH failed:", err);
    const message = typeof err?.message === "string" ? err.message : String(err);
    const isWorkingCopyLock =
      /working copy/i.test(message) ||
      /2795279/.test(message) ||
      /not yet supported/i.test(message);

    if (isWorkingCopyLock) {
      // Drupal JSON:API cannot patch moderated entities with working copies.
      // Continue to media upload so avatar/banner sync still succeeds.
      profilePatchWarning =
        "Profile text fields were skipped due to a Drupal working-copy lock; media upload continued.";
      console.warn(`[import-x-data] ${profilePatchWarning}`);
    } else {
    if (snapshotUuid) {
      await updateImportSnapshot(snapshotUuid, {
        status: "failed",
        errorMessage: err.message,
      });
    }
    return NextResponse.json(
      { error: `Failed to save to Drupal: ${err.message}` },
      { status: 500 }
    );
    }
  }

  // 7. Upload profile picture and banner to Drupal
  let pfpUploaded = false;
  let bannerUploaded = false;
  let pfpUploadId: string | null = null;
  let bannerUploadId: string | null = null;

  if (xData.profileImageUrl) {
    pfpUploadId = await uploadImageToDrupal(
      xData.profileImageUrl,
      profile.uuid,
      "field_profile_picture",
      `${xUsername}-pfp`
    );
    pfpUploaded = pfpUploadId !== null;
  }

  if (xData.bannerUrl) {
    bannerUploadId = await uploadImageToDrupal(
      xData.bannerUrl,
      profile.uuid,
      "field_background_banner",
      `${xUsername}-banner`
    );
    bannerUploaded = bannerUploadId !== null;
  }

  const fieldState = await getProfileMediaFieldState(profile.uuid);
  const profilePictureFileUuid = fieldState?.profilePictureFileId ?? pfpUploadId;
  const backgroundBannerFileUuid = fieldState?.backgroundBannerFileId ?? bannerUploadId;
  const [profilePictureUrl, backgroundBannerUrl] = await Promise.all([
    profilePictureFileUuid ? getDrupalFileAssetUrl(profilePictureFileUuid) : Promise.resolve(null),
    backgroundBannerFileUuid ? getDrupalFileAssetUrl(backgroundBannerFileUuid) : Promise.resolve(null),
  ]);

  if (snapshotUuid) {
    await updateImportSnapshot(snapshotUuid, {
      status: "success",
      profileUuid: profile.uuid,
      payload: {
        username: xData.username,
        followerCount: xData.followerCount,
        postsImported: topPostsJson.length,
        topFollowersImported: topFollowersJson.length,
        engagementScore: xData.metrics.engagement_score,
        verified: xData.verified,
        diagnostics: {
          uploadIds: {
            profilePicture: pfpUploadId,
            backgroundBanner: bannerUploadId,
          },
          profileFieldIds: {
            profilePicture: fieldState?.profilePictureFileId ?? null,
            backgroundBanner: fieldState?.backgroundBannerFileId ?? null,
          },
          mediaUrls: {
            profilePicture: profilePictureUrl,
            backgroundBanner: backgroundBannerUrl,
          },
        },
        warning: profilePatchWarning,
      },
    });
  }

  // Ensure published storefront reflects new profile media/posts immediately.
  revalidatePath(`/stores/${xUsername}`);
  revalidatePath(`/console/builder`);

  // 8. Return summary
  return NextResponse.json({
    success: true,
    profileId: profile.uuid,
    summary: {
      username: xData.username,
      displayName: xData.displayName,
      followerCount: xData.followerCount,
      postsImported: topPostsJson.length,
      topFollowersImported: topFollowersJson.length,
      engagementScore: xData.metrics.engagement_score,
      postingFrequency: xData.metrics.posting_frequency,
      topThemes: xData.metrics.top_themes,
      profileImageUrl: xData.profileImageUrl,
      bannerUrl: xData.bannerUrl,
      pfpUploaded,
      bannerUploaded,
      diagnostics: {
        uploadIds: {
          profilePicture: pfpUploadId,
          backgroundBanner: bannerUploadId,
        },
        profileFieldIds: {
          profilePicture: fieldState?.profilePictureFileId ?? null,
          backgroundBanner: fieldState?.backgroundBannerFileId ?? null,
        },
        mediaUrls: {
          profilePicture: profilePictureUrl,
          backgroundBanner: backgroundBannerUrl,
        },
      },
      warning: profilePatchWarning,
      verified: xData.verified,
    },
  });
}
