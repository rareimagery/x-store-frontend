import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isValidSlug } from "@/lib/slugs";
import { notifyAdminNewStore } from "@/lib/notifications";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";


import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

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
    url: `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net"}/${slug}`,
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

async function createDrupalStore(
  slug: string,
  storeName: string,
  ownerEmail: string,
  currency: string
) {
  const writeHeaders = await drupalWriteHeaders();
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
        relationships: {
          default_currency: {
            data: {
              type: "commerce_currency--commerce_currency",
              id: "1f1f906f-b263-4049-946d-914e73c0d102",
            },
          },
        },
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
  bioDescription?: string;
  followerCount?: number | null;
  profilePictureUrl?: string;
  backgroundBannerUrl?: string;
  topPosts?: string;
  topFollowers?: string;
  metrics?: string;
  myspaceAccentColor?: string;
  myspaceGlitterColor?: string;
  myspaceBackgroundUrl?: string;
  myspaceMusicUrl?: string;
}

async function createXProfile(storeId: string | null, fields: XProfileFields) {
  const attributes: Record<string, unknown> = {
    title: `${fields.xUsername} X Profile`,
    field_x_username: fields.xUsername,
  };

  // Optional fields — use actual Drupal field names
  if (fields.bioDescription) {
    attributes.field_x_bio = {
      value: fields.bioDescription,
      format: "basic_html",
    };
  }
  if (fields.followerCount != null) {
    attributes.field_x_followers = fields.followerCount;
  }
  if (fields.topPosts) {
    attributes.field_top_posts = fields.topPosts;
  }
  if (fields.topFollowers) {
    attributes.field_top_followers = fields.topFollowers;
  }
  if (fields.metrics) {
    attributes.field_metrics = fields.metrics;
  }

  // MySpace fields
  if (fields.myspaceAccentColor) {
    attributes.field_myspace_accent_color = fields.myspaceAccentColor;
  }
  if (fields.myspaceGlitterColor) {
    attributes.field_myspace_glitter_color = fields.myspaceGlitterColor;
  }
  if (fields.myspaceBackgroundUrl) {
    attributes.field_myspace_background = fields.myspaceBackgroundUrl;
  }
  if (fields.myspaceMusicUrl) {
    attributes.field_myspace_music_url = fields.myspaceMusicUrl;
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
        ...(storeId
          ? {
              relationships: {
                field_linked_store: {
                  data: { type: "commerce_store--online", id: storeId },
                },
              },
            }
          : {}),
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

// DNS provisioning removed — using path-based routing (/username) instead of subdomains

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
    const xProfileFields: XProfileFields = {
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
    };

    try {
      const storeData = await createDrupalStore(
        slug,
        storeName,
        ownerEmail,
        currency
      );
      let profileData: any = null;
      try {
        profileData = await createXProfile(storeData.data.id, xProfileFields);
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
          url: `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net"}/${slug}`,
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
        url: `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net"}/${slug}`,
      });
    } catch (storeErr: any) {
      const storeErrorMessage = String(storeErr?.message || "Store creation failed");

      if (!isStorePermissionError(storeErrorMessage)) {
        throw storeErr;
      }

      // Permission-gated fallback: create profile without linked commerce store,
      // so onboarding and theme setup can continue while Drupal perms are fixed.
      try {
        const profileData = await createXProfile(null, xProfileFields);

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
          url: `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net"}/${slug}`,
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
          url: `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net"}/${slug}`,
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
