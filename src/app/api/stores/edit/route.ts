import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

type EditJWT = { storeSlug?: string; xUsername?: string | null };

async function resolveStoreAndProfile(slug: string, xUsername?: string): Promise<{
  storeUuid: string;
  profileUuid: string;
  storeName: string;
  profileData: any;
} | null> {
  // Try by slug first
  let storeRes = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&include=field_x_user_profile&fields[commerce_store--online]=name&fields[node--x_user_profile]=field_x_display_name,field_x_bio,field_x_avatar_url,field_x_banner_url,field_x_location,field_x_website,field_x_followers,field_x_following,field_x_post_count,field_x_verified,field_x_verified_type`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );

  // Fallback: find via X profile
  if (!storeRes.ok || !(await storeRes.clone().json()).data?.length) {
    if (xUsername) {
      const profileRes = await fetch(
        `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?filter[field_x_username]=${encodeURIComponent(xUsername)}&include=field_linked_store`,
        { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
      );
      if (profileRes.ok) {
        const pJson = await profileRes.json();
        const profile = pJson.data?.[0];
        const storeRef = profile?.relationships?.field_linked_store?.data;
        if (profile && storeRef) {
          return {
            storeUuid: storeRef.id,
            profileUuid: profile.id,
            storeName: "",
            profileData: profile.attributes,
          };
        }
      }
    }
    return null;
  }

  const json = await storeRes.json();
  const store = json.data?.[0];
  const included = json.included || [];
  const profile = included.find((i: any) => i.type === "node--x_user_profile");

  if (!store) return null;

  return {
    storeUuid: store.id,
    profileUuid: profile?.id || "",
    storeName: store.attributes?.name || "",
    profileData: profile?.attributes || {},
  };
}

// GET — load current store + profile data for editing
export async function GET(req: NextRequest) {
  const token = await getToken({ req }) as EditJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = (token.storeSlug || token.xUsername || "").replace(/^@+/, "").trim().toLowerCase();
  if (!slug) return NextResponse.json({ error: "No store" }, { status: 404 });

  const xUsername = token.xUsername ? String(token.xUsername).replace(/^@+/, "").trim().toLowerCase() : undefined;
  const data = await resolveStoreAndProfile(slug, xUsername);
  if (!data) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  return NextResponse.json({
    storeName: data.storeName,
    displayName: data.profileData.field_x_display_name || "",
    bio: typeof data.profileData.field_x_bio === "object" ? data.profileData.field_x_bio?.value : data.profileData.field_x_bio || "",
    avatarUrl: data.profileData.field_x_avatar_url || "",
    bannerUrl: data.profileData.field_x_banner_url || "",
    location: data.profileData.field_x_location || "",
    website: typeof data.profileData.field_x_website === "object" ? data.profileData.field_x_website?.uri : data.profileData.field_x_website || "",
    followers: data.profileData.field_x_followers || 0,
    following: data.profileData.field_x_following || 0,
    postCount: data.profileData.field_x_post_count || 0,
    verified: data.profileData.field_x_verified || false,
    verifiedType: data.profileData.field_x_verified_type || "none",
  });
}

// PATCH — update store name + profile fields
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req }) as EditJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = (token.storeSlug || token.xUsername || "").replace(/^@+/, "").trim().toLowerCase();
  if (!slug) return NextResponse.json({ error: "No store" }, { status: 404 });

  const xUsername = token.xUsername ? String(token.xUsername).replace(/^@+/, "").trim().toLowerCase() : undefined;
  const data = await resolveStoreAndProfile(slug, xUsername);
  if (!data) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const body = await req.json();
  const writeHeaders = await drupalWriteHeaders();

  // Update store name
  if (body.storeName && typeof body.storeName === "string" && body.storeName.trim().length >= 3) {
    await fetch(`${DRUPAL_API_URL}/jsonapi/commerce_store/online/${data.storeUuid}`, {
      method: "PATCH",
      headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: {
          type: "commerce_store--online",
          id: data.storeUuid,
          attributes: { name: body.storeName.trim() },
        },
      }),
    });
  }

  // Update profile fields
  if (data.profileUuid) {
    const profileAttrs: Record<string, unknown> = {};
    if (body.displayName !== undefined) profileAttrs.field_x_display_name = body.displayName.trim().slice(0, 100);
    if (body.bio !== undefined) profileAttrs.field_x_bio = { value: body.bio.trim().slice(0, 500), format: "basic_html" };
    if (body.location !== undefined) profileAttrs.field_x_location = body.location.trim().slice(0, 100);
    if (body.website !== undefined) profileAttrs.field_x_website = body.website.trim() ? { uri: body.website.trim() } : null;

    if (Object.keys(profileAttrs).length > 0) {
      await fetch(`${DRUPAL_API_URL}/jsonapi/node/x_user_profile/${data.profileUuid}`, {
        method: "PATCH",
        headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
        body: JSON.stringify({
          data: {
            type: "node--x_user_profile",
            id: data.profileUuid,
            attributes: profileAttrs,
          },
        }),
      });
    }
  }

  return NextResponse.json({ success: true });
}
