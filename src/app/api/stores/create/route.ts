import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isValidSlug } from "@/lib/slugs";
import { notifyAdminNewStore } from "@/lib/notifications";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";


import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { getStoreUrl } from "@/lib/store-url";
import { fetchXProfile } from "@/lib/x-api/user";

const DRUPAL_API = process.env.DRUPAL_API_URL;

function isLikelyDrupalOutage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("fetch failed") ||
    normalized.includes("network") ||
    normalized.includes("econnrefused") ||
    normalized.includes("enotfound") ||
    normalized.includes("timed out") ||
    normalized.includes("could not verify existing stores") ||
    normalized.includes("could not validate subdomain availability")
  );
}

function drupalOutageFallback(slug: string, reason: string) {
  return NextResponse.json({
    success: true,
    partial: true,
    outageMode: true,
    warning:
      "Drupal is temporarily unreachable. Your builder access is enabled, but store provisioning is pending until backend connectivity is restored.",
    reason,
    storeId: null,
    storeDrupalId: null,
    profileNodeId: null,
    slug,
    url: getStoreUrl(slug),
  });
}

function normalizeHandle(handle: string | null | undefined): string {
  return String(handle || "").trim().replace(/^@+/, "").toLowerCase();
}

function multiStoreTestModeEnabled(): boolean {
  return String(process.env.MULTI_STORE_TEST_MODE || "false").toLowerCase() === "true";
}

function multiStoreAllowlist(): string[] {
  return String(process.env.MULTI_STORE_TEST_ALLOWLIST || "")
    .split(",")
    .map((h) => normalizeHandle(h))
    .filter(Boolean);
}

function maxStoresPerOwner(): number {
  const parsed = Number.parseInt(process.env.MAX_STORES_PER_OWNER || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

async function getStoreCountForXUsername(xUsername: string): Promise<number> {
  try {
    const res: Response = await fetch(
      `${DRUPAL_API}/jsonapi/node/x_user_profile?filter[field_x_username]=${encodeURIComponent(xUsername)}&include=field_linked_store`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );

    if (!res.ok) {
      throw new Error(`Could not verify existing stores (${res.status}).`);
    }

    const json = await res.json();
    const profiles = Array.isArray(json.data) ? json.data : [];

    const uniqueStoreIds = new Set<string>();
    for (const profile of profiles) {
      const storeId = profile?.relationships?.field_linked_store?.data?.id;
      if (typeof storeId === "string" && storeId.length > 0) {
        uniqueStoreIds.add(storeId);
      }
    }
    return uniqueStoreIds.size;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify existing stores.";
    throw new Error(message);
  }
}

async function isSlugTaken(slug: string): Promise<boolean> {
  try {
    const res: Response = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_store/online?filter[field_store_slug]=${slug}`,
      { headers: { ...drupalAuthHeaders() } }
    );

    if (!res.ok) {
      throw new Error(`Could not validate slug availability (${res.status}).`);
    }

    const data = await res.json();
    return (data?.data?.length ?? 0) > 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not validate slug availability.";
    throw new Error(message);
  }
}

/**
 * Create a Drupal user account for the creator with x_creator role.
 * Returns { uuid, uid } or null if creation fails.
 */
async function createDrupalCreatorUser(
  username: string,
  email: string
): Promise<{ uuid: string; uid: number } | null> {
  try {
    const writeHeaders = await drupalWriteHeaders();
    const password = `ri_${username}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const res = await fetch(`${DRUPAL_API}/jsonapi/user/user`, {
      method: "POST",
      headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: {
          type: "user--user",
          attributes: {
            name: username.toLowerCase(),
            mail: email,
            pass: password,
            status: true,
          },
        },
      }),
    });
    if (!res.ok) {
      console.warn(`[stores/create] Drupal user creation failed (${res.status}):`, await res.text().catch(() => ""));
      return null;
    }
    const json = await res.json();
    const uuid = json.data?.id;
    const uid = json.data?.attributes?.drupal_internal__uid;

    // Assign x_creator role via Drush-style PATCH (roles are managed via relationship)
    if (uuid) {
      try {
        await fetch(`${DRUPAL_API}/jsonapi/user/user/${uuid}/relationships/roles`, {
          method: "POST",
          headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
          body: JSON.stringify({
            data: [{ type: "user_role--user_role", id: "x_creator" }],
          }),
        });
      } catch {
        console.warn("[stores/create] Failed to assign x_creator role");
      }
    }

    console.log(`[stores/create] Drupal user created: ${username} (uid=${uid}, uuid=${uuid})`);
    return uuid ? { uuid, uid } : null;
  } catch (err) {
    console.warn("[stores/create] Drupal user creation error:", err);
    return null;
  }
}

async function createDrupalStore(
  slug: string,
  storeName: string,
  ownerEmail: string,
  currency: string,
  ownerUserUuid?: string | null
) {
  const writeHeaders = await drupalWriteHeaders();

  const relationships: Record<string, unknown> = {
    default_currency: {
      data: {
        type: "commerce_currency--commerce_currency",
        id: "1f1f906f-b263-4049-946d-914e73c0d102",
      },
    },
  };

  // Set owner to the creator's Drupal user (not the API service user)
  if (ownerUserUuid) {
    relationships.uid = {
      data: { type: "user--user", id: ownerUserUuid },
    };
  }

  const res = await fetch(`${DRUPAL_API}/jsonapi/commerce_store/online`, {
    method: "POST",
    headers: {
      ...writeHeaders,
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "commerce_store--online",
        attributes: {
          name: storeName,
          field_store_slug: slug,
          mail: ownerEmail,
          timezone: "America/New_York",
          address: {
            country_code: "US",
            address_line1: "N/A",
            locality: "New York",
            administrative_area: "NY",
            postal_code: "10001",
          },
          field_store_status: "approved",
        },
        relationships,
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("Store creation error:", errText);
    throw new Error(`Drupal store creation failed: ${res.status} — ${errText.slice(0, 300)}`);
  }
  return res.json();
}

interface XProfileFields {
  xUsername: string;
  xUserId?: string;
  displayName?: string;
  bioDescription?: string;
  followerCount?: number | null;
  followingCount?: number | null;
  postCount?: number | null;
  verified?: boolean;
  verifiedType?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  location?: string;
  joinedDate?: string;
  website?: string;
  rawJson?: string;
  topPosts?: string;
  topFollowers?: string;
  metrics?: string;
  myspaceAccentColor?: string;
  myspaceGlitterColor?: string;
  myspaceBackgroundUrl?: string;
  myspaceMusicUrl?: string;
}

async function createXProfile(
  storeId: string | null,
  fields: XProfileFields,
  drupalUserUuid?: string | null
) {
  const attributes: Record<string, unknown> = {
    title: `${fields.xUsername} X Profile`,
    field_x_username: fields.xUsername,
  };

  // Core X fields
  if (fields.xUserId) attributes.field_x_user_id = Number(fields.xUserId);
  if (fields.displayName) attributes.field_x_display_name = fields.displayName;
  if (fields.bioDescription) attributes.field_x_bio = { value: fields.bioDescription, format: "basic_html" };
  if (fields.followerCount != null) attributes.field_x_followers = fields.followerCount;
  if (fields.followingCount != null) attributes.field_x_following = fields.followingCount;
  if (fields.postCount != null) attributes.field_x_post_count = fields.postCount;
  if (fields.verified != null) attributes.field_x_verified = fields.verified;
  if (fields.verifiedType) attributes.field_x_verified_type = fields.verifiedType;
  if (fields.avatarUrl) attributes.field_x_avatar_url = fields.avatarUrl;
  if (fields.bannerUrl) attributes.field_x_banner_url = fields.bannerUrl;
  if (fields.location) attributes.field_x_location = fields.location;
  if (fields.joinedDate) attributes.field_x_joined_date = fields.joinedDate;
  if (fields.website) attributes.field_x_website = { uri: fields.website };
  if (fields.rawJson) attributes.field_x_raw_json = fields.rawJson;

  // Existing rich data fields
  if (fields.topPosts) attributes.field_top_posts = fields.topPosts;
  if (fields.topFollowers) attributes.field_top_followers = fields.topFollowers;
  if (fields.metrics) attributes.field_metrics = fields.metrics;

  // MySpace theme fields
  if (fields.myspaceAccentColor) attributes.field_myspace_accent_color = fields.myspaceAccentColor;
  if (fields.myspaceGlitterColor) attributes.field_myspace_glitter_color = fields.myspaceGlitterColor;
  if (fields.myspaceBackgroundUrl) attributes.field_myspace_background = fields.myspaceBackgroundUrl;
  if (fields.myspaceMusicUrl) attributes.field_myspace_music_url = fields.myspaceMusicUrl;

  // Build relationships
  const relationships: Record<string, unknown> = {};
  if (storeId) {
    relationships.field_linked_store = {
      data: { type: "commerce_store--online", id: storeId },
    };
  }
  if (drupalUserUuid) {
    relationships.field_x_linked_user = {
      data: { type: "user--user", id: drupalUserUuid },
    };
  }

  const profileWriteHeaders = await drupalWriteHeaders();
  const res = await fetch(`${DRUPAL_API}/jsonapi/node/x_user_profile`, {
    method: "POST",
    headers: {
      ...profileWriteHeaders,
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "node--x_user_profile",
        attributes,
        ...(Object.keys(relationships).length > 0 ? { relationships } : {}),
      },
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `X Profile creation failed: ${res.status} — ${errBody.slice(0, 200)}`
    );
  }
  return res.json();
}

function isStorePermissionError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("create online commerce_store") ||
    normalized.includes("create commerce_store") ||
    normalized.includes("administer commerce_store")
  );
}

function isWritePermissionError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("forbidden") ||
    normalized.includes("status\":\"403\"") ||
    normalized.includes("failed: 403")
  );
}

const storeCreateLimit = createRateLimiter({ limit: 3, windowMs: 60 * 60 * 1000 }); // 3/hour

// DNS provisioning: subdomains are the canonical URL format (username.rareimagery.net)
// Cloudflare DNS records are created automatically when CLOUDFLARE_MANAGE_DNS=true

export async function POST(req: NextRequest) {
  if (!DRUPAL_API) {
    return NextResponse.json(
      { error: "Drupal API URL is not configured on the server." },
      { status: 500 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionMeta = session as typeof session & {
    xUsername?: string | null;
    xId?: string | null;
  };

  // Policy: only X-authenticated sessions can create accounts/stores.
  if (!sessionMeta.xUsername || !sessionMeta.xId) {
    return NextResponse.json(
      { error: "Store creation requires X authentication. Sign in with X to continue." },
      { status: 403 }
    );
  }

  const userId = session.user?.email || "anon";
  const rl = storeCreateLimit(userId);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const {
    storeName,
    slug,
    ownerEmail,
    currency,
    agreedToTerms,
    xUsername,
    bioDescription,
    followerCount,
    topPosts,
    topFollowers,
    metrics,
    myspaceAccentColor,
    myspaceGlitterColor,
    myspaceBackgroundUrl,
    myspaceMusicUrl,
  } = body;

  if (!xUsername || String(xUsername).toLowerCase() !== String(sessionMeta.xUsername).toLowerCase()) {
    return NextResponse.json(
      { error: "xUsername must match your authenticated X account." },
      { status: 403 }
    );
  }

  if (!agreedToTerms) {
    return NextResponse.json(
      { error: "You must agree to the Terms of Service, EULA, and Privacy Policy" },
      { status: 400 }
    );
  }

  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: "Slug must be 3-30 lowercase letters, numbers, or hyphens" },
      { status: 400 }
    );
  }

  const normalizedSessionUser = normalizeHandle(sessionMeta.xUsername);
  const multiStoreEnabledForUser =
    multiStoreTestModeEnabled() && multiStoreAllowlist().includes(normalizedSessionUser);
  let existingStoreCount = 0;
  try {
    existingStoreCount = await getStoreCountForXUsername(normalizedSessionUser);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify store limits.";
    if (isLikelyDrupalOutage(message)) {
      return drupalOutageFallback(slug, message);
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const maxAllowedStores = multiStoreEnabledForUser ? maxStoresPerOwner() : 1;

  if (existingStoreCount >= maxAllowedStores) {
    const message = multiStoreEnabledForUser
      ? `Store limit reached (${maxAllowedStores}). Increase MAX_STORES_PER_OWNER for additional testing stores.`
      : "This account already has a store. Multi-store is currently disabled for your account.";

    return NextResponse.json(
      {
        error: message,
        storeLimitReached: true,
        maxAllowedStores,
        existingStoreCount,
      },
      { status: 403 }
    );
  }

  let slugTaken = false;
  try {
    slugTaken = await isSlugTaken(slug);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not validate slug availability.";
    if (isLikelyDrupalOutage(message)) {
      return drupalOutageFallback(slug, message);
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (slugTaken) {
    return NextResponse.json(
      { error: "That URL slug is already taken" },
      { status: 409 }
    );
  }

  try {
    // Step 1: Fetch full X profile data from X API v2
    let xFullProfile: any = null;
    try {
      const xProfileRes = await fetchXProfile(xUsername);
      xFullProfile = xProfileRes.data;
    } catch (err) {
      console.warn("[stores/create] X API profile fetch failed (continuing with session data):", err);
    }

    const xMetrics = xFullProfile?.public_metrics;
    const xProfileFields: XProfileFields = {
      xUsername,
      xUserId: xFullProfile?.id || undefined,
      displayName: xFullProfile?.name || storeName.replace("'s Store", ""),
      bioDescription: xFullProfile?.description || bioDescription,
      followerCount: xMetrics?.followers_count ?? followerCount,
      followingCount: xMetrics?.following_count ?? null,
      postCount: xMetrics?.tweet_count ?? null,
      verified: xFullProfile?.verified_type ? xFullProfile.verified_type !== "none" : undefined,
      verifiedType: xFullProfile?.verified_type || undefined,
      avatarUrl: xFullProfile?.profile_image_url?.replace("_normal", "_400x400") || undefined,
      bannerUrl: xFullProfile?.profile_banner_url || undefined,
      location: xFullProfile?.location || undefined,
      joinedDate: xFullProfile?.created_at ? xFullProfile.created_at.split("T")[0] : undefined,
      website: xFullProfile?.url || (xFullProfile?.entities?.url?.urls?.[0]?.expanded_url) || undefined,
      rawJson: xFullProfile ? JSON.stringify(xFullProfile) : undefined,
      topPosts,
      topFollowers,
      metrics,
      myspaceAccentColor,
      myspaceGlitterColor,
      myspaceBackgroundUrl,
      myspaceMusicUrl,
    };

    // Step 2: Create Drupal user account for the creator
    const drupalUser = await createDrupalCreatorUser(
      xUsername,
      ownerEmail
    );

    try {
      // Step 3: Create Commerce Store (owned by the new Drupal user)
      const storeData = await createDrupalStore(
        slug,
        storeName,
        ownerEmail,
        currency,
        drupalUser?.uuid || null
      );

      // Step 4: Create X Profile node linked to store + Drupal user
      let profileData: any = null;
      try {
        profileData = await createXProfile(storeData.data.id, xProfileFields, drupalUser?.uuid || null);
      } catch (profileErr: any) {
        const profileErrorMessage = String(
          profileErr?.message || "X profile creation failed"
        );

        if (!isWritePermissionError(profileErrorMessage)) {
          throw profileErr;
        }

        return NextResponse.json({
          success: true,
          partial: true,
          warning:
            "Your store was created, but profile creation is pending backend permissions. " +
            "An admin must grant Drupal permission to create creator profiles.",
          storeId: storeData.data.id,
          storeDrupalId: String(
            storeData.data.attributes?.drupal_internal__store_id ?? ""
          ),
          profileNodeId: null,
          slug,
          url: getStoreUrl(slug),
        });
      }

      // Notify admin of new store submission (fire-and-forget)
      notifyAdminNewStore(
        storeName,
        slug,
        xUsername || slug,
        ownerEmail || session.user?.email || ""
      ).catch((err) => console.error("Admin notification failed:", err));

      return NextResponse.json({
        success: true,
        storeId: storeData.data.id,
        storeDrupalId: String(
          storeData.data.attributes?.drupal_internal__store_id ?? ""
        ),
        profileNodeId: profileData.data.id,
        slug,
        url: getStoreUrl(slug),
      });
    } catch (storeErr: any) {
      const storeErrorMessage = String(storeErr?.message || "Store creation failed");

      if (!isStorePermissionError(storeErrorMessage)) {
        throw storeErr;
      }

      // Permission-gated fallback: create profile without linked commerce store,
      // so onboarding and theme setup can continue while Drupal perms are fixed.
      try {
        const profileData = await createXProfile(null, xProfileFields, drupalUser?.uuid || null);

        return NextResponse.json({
          success: true,
          partial: true,
          warning:
            "Your profile was created, but store creation is pending backend permissions. " +
            "An admin must grant Drupal permission: create online commerce_store.",
          storeId: null,
          storeDrupalId: null,
          profileNodeId: profileData.data.id,
          slug,
          url: getStoreUrl(slug),
        });
      } catch (profileErr: any) {
        const profileErrorMessage = String(
          profileErr?.message || "X profile creation failed"
        );

        if (!isWritePermissionError(profileErrorMessage)) {
          throw profileErr;
        }

        return NextResponse.json({
          success: true,
          partial: true,
          warning:
            "Account setup started, but both store and profile creation are pending backend Drupal permissions. " +
            "An admin must grant: create online commerce_store and creator profile create permission.",
          storeId: null,
          storeDrupalId: null,
          profileNodeId: null,
          slug,
          url: getStoreUrl(slug),
        });
      }
    }
  } catch (err: any) {
    const message = String(err?.message || "Store creation failed");
    if (isLikelyDrupalOutage(message)) {
      return drupalOutageFallback(slug, message);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
