import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { isValidSlug } from "@/lib/slugs";

type SlugJWT = { storeSlug?: string; xUsername?: string | null };

export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as SlugJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newSlug } = await req.json();
  if (!newSlug || !isValidSlug(newSlug)) {
    return NextResponse.json({ error: "Invalid slug. Must be 3-30 lowercase letters, numbers, or hyphens." }, { status: 400 });
  }

  // Check availability
  const checkRes = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(newSlug)}&fields[commerce_store--online]=name`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );
  if (checkRes.ok) {
    const checkJson = await checkRes.json();
    if ((checkJson.data || []).length > 0) {
      return NextResponse.json({ error: "This subdomain is already taken" }, { status: 409 });
    }
  }

  // Find current store
  const currentSlug = (token.storeSlug || token.xUsername || "").replace(/^@+/, "").trim().toLowerCase();
  const xUsername = token.xUsername ? String(token.xUsername).replace(/^@+/, "").trim().toLowerCase() : undefined;

  let storeUuid: string | null = null;

  // Try by current slug
  const storeRes = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(currentSlug)}&fields[commerce_store--online]=field_store_slug`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );
  if (storeRes.ok) {
    const storeJson = await storeRes.json();
    storeUuid = storeJson.data?.[0]?.id || null;
  }

  // Fallback via profile
  if (!storeUuid && xUsername) {
    const profileRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?filter[field_x_username]=${encodeURIComponent(xUsername)}&include=field_linked_store`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (profileRes.ok) {
      const pJson = await profileRes.json();
      storeUuid = pJson.data?.[0]?.relationships?.field_linked_store?.data?.id || null;
    }
  }

  if (!storeUuid) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // Update slug
  const writeHeaders = await drupalWriteHeaders();
  const patchRes = await fetch(`${DRUPAL_API_URL}/jsonapi/commerce_store/online/${storeUuid}`, {
    method: "PATCH",
    headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify({
      data: {
        type: "commerce_store--online",
        id: storeUuid,
        attributes: { field_store_slug: newSlug },
      },
    }),
  });

  if (!patchRes.ok) {
    return NextResponse.json({ error: "Failed to update subdomain" }, { status: 500 });
  }

  // Provision DNS (if Cloudflare is configured)
  try {
    const { ensureStoreSubdomainDns } = await import("@/lib/cloudflare");
    await ensureStoreSubdomainDns(newSlug);
  } catch {
    // DNS provisioning is non-critical — wildcard handles it
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net";
  return NextResponse.json({
    success: true,
    slug: newSlug,
    url: `https://${newSlug}.${baseDomain}`,
    warning: "Your old subdomain will stop working. Update any shared links.",
  });
}
