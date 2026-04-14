import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

/**
 * GET /api/stores/gate-settings
 * Returns the X Subscribe Gate settings for the authenticated creator's store.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeSlug = (token.storeSlug as string) || (token.xUsername as string) || "";
  if (!storeSlug) return NextResponse.json({ error: "No store" }, { status: 404 });

  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(storeSlug)}&fields[commerce_store--online]=field_subscribe_gate_enabled,field_subscribe_gate_days,field_subscribe_gate_mode,field_subscribe_gate_bonus`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );

    if (!res.ok) return NextResponse.json({ error: "Failed to load" }, { status: 502 });

    const json = await res.json();
    const store = json.data?.[0];
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const attrs = store.attributes || {};
    return NextResponse.json({
      storeId: store.id,
      gateEnabled: attrs.field_subscribe_gate_enabled ?? false,
      graceDays: attrs.field_subscribe_gate_days ?? 3,
      gateMode: attrs.field_subscribe_gate_mode || "soft",
      gateBonus: attrs.field_subscribe_gate_bonus || "none",
    });
  } catch {
    return NextResponse.json({ error: "Failed to load" }, { status: 502 });
  }
}

/**
 * PATCH /api/stores/gate-settings
 * Update X Subscribe Gate settings.
 */
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeSlug = (token.storeSlug as string) || (token.xUsername as string) || "";
  if (!storeSlug) return NextResponse.json({ error: "No store" }, { status: 404 });

  const body = await req.json();

  try {
    // Find store UUID
    const findRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(storeSlug)}&fields[commerce_store--online]=field_store_slug`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );

    if (!findRes.ok) return NextResponse.json({ error: "Store lookup failed" }, { status: 502 });
    const findJson = await findRes.json();
    const store = findJson.data?.[0];
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const storeUuid = store.id;

    // Update gate settings via JSON:API PATCH
    const writeHeaders = await drupalWriteHeaders();
    const patchRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${storeUuid}`,
      {
        method: "PATCH",
        headers: {
          ...writeHeaders,
          "Content-Type": "application/vnd.api+json",
          Accept: "application/vnd.api+json",
        },
        body: JSON.stringify({
          data: {
            type: "commerce_store--online",
            id: storeUuid,
            attributes: {
              field_subscribe_gate_enabled: body.gateEnabled ?? false,
              field_subscribe_gate_days: body.graceDays ?? 3,
              field_subscribe_gate_mode: body.gateMode || "soft",
              field_subscribe_gate_bonus: body.gateBonus || "none",
            },
          },
        }),
      }
    );

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error("[gate-settings] PATCH failed:", patchRes.status, errText);
      return NextResponse.json({ error: "Save failed" }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[gate-settings] Error:", err);
    return NextResponse.json({ error: "Save failed" }, { status: 502 });
  }
}
