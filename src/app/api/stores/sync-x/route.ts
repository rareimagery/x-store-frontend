import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { fetchXProfile } from "@/lib/x-api/user";

type SyncJWT = { xUsername?: string | null };

export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as SyncJWT | null;
  if (!token || !token.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const xUsername = String(token.xUsername).replace(/^@+/, "").trim().toLowerCase();

  // Find profile node
  const profileRes = await fetch(
    `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?filter[field_x_username]=${encodeURIComponent(xUsername)}&fields[node--x_user_profile]=field_x_username`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );
  if (!profileRes.ok) {
    return NextResponse.json({ error: "Profile lookup failed" }, { status: 502 });
  }
  const profileJson = await profileRes.json();
  const profileUuid = profileJson.data?.[0]?.id;
  if (!profileUuid) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Fetch fresh X profile data
  let xUser: any;
  try {
    const xRes = await fetchXProfile(xUsername);
    xUser = xRes.data;
  } catch (err: any) {
    return NextResponse.json({ error: `X API failed: ${err.message}` }, { status: 502 });
  }

  if (!xUser) {
    return NextResponse.json({ error: "X user not found" }, { status: 404 });
  }

  const metrics = xUser.public_metrics || {};

  // Update Drupal profile with ALL fresh data
  const writeHeaders = await drupalWriteHeaders();
  const attributes: Record<string, unknown> = {
    field_x_display_name: xUser.name || "",
    field_x_bio: { value: xUser.description || "", format: "basic_html" },
    field_x_avatar_url: xUser.profile_image_url?.replace("_normal", "_400x400") || "",
    field_x_banner_url: xUser.profile_banner_url || "",
    field_x_verified: !!xUser.verified_type && xUser.verified_type !== "none",
    field_x_verified_type: xUser.verified_type || "none",
    field_x_followers: metrics.followers_count || 0,
    field_x_following: metrics.following_count || 0,
    field_x_post_count: metrics.tweet_count || 0,
    field_x_location: xUser.location || "",
    field_x_raw_json: JSON.stringify(xUser),
  };

  if (xUser.created_at) {
    attributes.field_x_joined_date = xUser.created_at.split("T")[0];
  }
  if (xUser.url || xUser.entities?.url?.urls?.[0]?.expanded_url) {
    attributes.field_x_website = { uri: xUser.entities?.url?.urls?.[0]?.expanded_url || xUser.url };
  }

  const patchRes = await fetch(`${DRUPAL_API_URL}/jsonapi/node/x_user_profile/${profileUuid}`, {
    method: "PATCH",
    headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify({
      data: {
        type: "node--x_user_profile",
        id: profileUuid,
        attributes,
      },
    }),
  });

  if (!patchRes.ok) {
    const errText = await patchRes.text().catch(() => "");
    return NextResponse.json({ error: `Sync failed: ${errText.slice(0, 200)}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    displayName: xUser.name,
    bio: xUser.description,
    avatarUrl: xUser.profile_image_url?.replace("_normal", "_400x400"),
    bannerUrl: xUser.profile_banner_url,
    followers: metrics.followers_count,
    following: metrics.following_count,
    postCount: metrics.tweet_count,
    verified: !!xUser.verified_type && xUser.verified_type !== "none",
    verifiedType: xUser.verified_type,
    location: xUser.location,
  });
}
