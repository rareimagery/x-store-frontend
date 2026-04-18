import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isValidSlug } from "@/lib/slugs";
import { notifyAdminNewStore, notifyCreator } from "@/lib/notifications";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import { getStoreUrl } from "@/lib/store-url";

function isLikelyDrupalOutage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("fetch failed") ||
    normalized.includes("network") ||
    normalized.includes("econnrefused") ||
    normalized.includes("enotfound") ||
    normalized.includes("timed out")
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

const storeCreateLimit = createRateLimiter({ limit: 3, windowMs: 60 * 60 * 1000 });

/**
 * POST /api/stores/create
 * Thin proxy to Drupal: POST /api/creator/provision
 * Creates Drupal user + X profile + Commerce store atomically.
 */
export async function POST(req: NextRequest) {
  if (!DRUPAL_API_URL) {
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
    role?: string | null;
  };

  const isAdmin = sessionMeta.role === "admin";

  // Non-admin users must authenticate via X
  if (!isAdmin && (!sessionMeta.xUsername || !sessionMeta.xId)) {
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

  const { storeName, slug: bodySlug, ownerEmail, agreedToTerms, password } = body;

  // xUsername: admin can set any value (or leave empty); non-admin must match session
  const xUsername = isAdmin
    ? (body.xUsername ? String(body.xUsername) : "")
    : (body.xUsername ? String(body.xUsername) : String(sessionMeta.xUsername));

  if (!isAdmin && body.xUsername && String(body.xUsername).toLowerCase() !== String(sessionMeta.xUsername).toLowerCase()) {
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

  // Slug: use provided, or default to lowercase username, or require explicit for non-X
  const slug = bodySlug
    || (xUsername ? xUsername.replace(/^@+/, "").trim().toLowerCase() : "");

  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: "Slug must be 3-30 lowercase letters, numbers, or hyphens" },
      { status: 400 }
    );
  }

  try {
    const provisionPayload: Record<string, string> = {
      x_username: xUsername,
      slug: slug.trim().toLowerCase(),
      store_name: storeName || (xUsername ? `${xUsername}'s Store` : `${slug}'s Store`),
    };
    // Admin-created stores: pass email + password so Drupal creates a credentials-based user
    if (ownerEmail) provisionPayload.email = ownerEmail;
    if (password) provisionPayload.password = password;

    const res = await fetch(`${DRUPAL_API_URL}/api/creator/provision`, {
      method: "POST",
      headers: { ...drupalAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(provisionPayload),
      cache: "no-store",
    });

    const data = await res.json();

    // Slug already taken
    if (res.status === 409) {
      if (data.existing) {
        return NextResponse.json({
          error: "This account already has a store.",
          storeLimitReached: true,
        }, { status: 403 });
      }
      return NextResponse.json(
        { error: data.error || "That URL slug is already taken" },
        { status: 409 }
      );
    }

    // Drupal error
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Store creation failed" },
        { status: res.status }
      );
    }

    const displayName = storeName || (xUsername ? `${xUsername}'s Store` : `${slug}'s Store`);

    // Notify admin of new store (fire-and-forget)
    notifyAdminNewStore(
      displayName,
      slug,
      xUsername || "(no X account)",
      ownerEmail || session.user?.email || ""
    ).catch((err) => console.error("Admin notification failed:", err));

    // Welcome notification to creator (fire-and-forget)
    // DM only works if xUsername is set; email fallback otherwise
    notifyCreator({
      type: "welcome",
      xUsername: xUsername || undefined,
      email: ownerEmail || session.user?.email || undefined,
      storeName: displayName,
      storeSlug: data.slug || slug,
    }).catch((err) => console.error("Welcome notification failed:", err));

    return NextResponse.json({
      success: true,
      storeId: data.store_uuid || null,
      storeDrupalId: data.store_id ? String(data.store_id) : null,
      profileNodeId: data.profile_uuid || null,
      slug: data.slug || slug,
      url: data.url || getStoreUrl(slug),
      partial: data.warning ? true : undefined,
      warning: data.warning || undefined,
    });
  } catch (err: any) {
    const message = String(err?.message || "Store creation failed");
    if (isLikelyDrupalOutage(message)) {
      return drupalOutageFallback(slug, message);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
