import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

export interface DonationCampaign {
  id: string;
  drupalId: number;
  title: string;
  description: string;
  goalAmount: number;
  raisedAmount: number;
  donorCount: number;
  imageUrl: string | null;
  category: string | null;
  endDate: string | null;
  minDonation: number;
  suggestedAmounts: number[];
  donorWallEnabled: boolean;
  allowAnonymous: boolean;
  thankYouMessage: string | null;
  storeSlug: string;
  creatorUsername: string;
}

/** GET /api/donations?store=slug — Fetch campaigns for a store */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("store");
  const campaignId = req.nextUrl.searchParams.get("id");

  if (!DRUPAL_API) {
    return NextResponse.json({ error: "Drupal not configured" }, { status: 500 });
  }

  // Fetch a single campaign by ID
  if (campaignId) {
    const res = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_product/donation/${campaignId}?include=variations,stores`,
      {
        headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" },
        next: { revalidate: 30 },
      }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    const json = await res.json();
    const campaign = mapCampaign(json.data, json.included || []);
    return NextResponse.json({ campaign });
  }

  // Fetch all campaigns for a store
  if (!slug) {
    return NextResponse.json({ error: "store parameter required" }, { status: 400 });
  }

  // Get store internal ID by slug
  const storeRes = await fetch(
    `${DRUPAL_API}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}`,
    {
      headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" },
      next: { revalidate: 60 },
    }
  );
  if (!storeRes.ok) {
    return NextResponse.json({ campaigns: [] });
  }
  const storeJson = await storeRes.json();
  const store = storeJson.data?.[0];
  if (!store) {
    return NextResponse.json({ campaigns: [] });
  }
  const storeInternalId = store.attributes.drupal_internal__store_id;

  // Fetch donation products for this store
  const prodRes = await fetch(
    `${DRUPAL_API}/jsonapi/commerce_product/donation?filter[stores.meta.drupal_internal__target_id]=${storeInternalId}&include=variations,stores&sort=-created`,
    {
      headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" },
      next: { revalidate: 30 },
    }
  );
  if (!prodRes.ok) {
    return NextResponse.json({ campaigns: [] });
  }
  const prodJson = await prodRes.json();
  const campaigns = (prodJson.data || []).map((p: any) =>
    mapCampaign(p, prodJson.included || [])
  );

  return NextResponse.json({ campaigns });
}

/** POST /api/donations — Create a new campaign (admin only) */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (token?.role !== "admin") {
    return NextResponse.json({ error: "Only administrators can create donation campaigns" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    description,
    goalAmount,
    imageUrl,
    category,
    endDate,
    minDonation,
    suggestedAmounts,
    donorWallEnabled,
    allowAnonymous,
    thankYouMessage,
    storeId,
  } = body;

  if (!title || !goalAmount || !storeId) {
    return NextResponse.json(
      { error: "title, goalAmount, and storeId are required" },
      { status: 400 }
    );
  }

  const writeHeaders = await drupalWriteHeaders();

  // Create the donation variation (price = $0, buyer sets amount)
  const varRes = await fetch(`${DRUPAL_API}/jsonapi/commerce_product_variation/donation`, {
    method: "POST",
    headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify({
      data: {
        type: "commerce_product_variation--donation",
        attributes: {
          sku: `donate-${Date.now().toString(36)}`,
          price: { number: "0.00", currency_code: "USD" },
          status: true,
        },
      },
    }),
  });

  if (!varRes.ok) {
    const text = await varRes.text();
    return NextResponse.json({ error: `Variation creation failed: ${text}` }, { status: 500 });
  }
  const varJson = await varRes.json();
  const variationId = varJson.data.id;

  // Create the donation product
  const suggestedJson =
    Array.isArray(suggestedAmounts) && suggestedAmounts.length
      ? JSON.stringify(suggestedAmounts)
      : JSON.stringify([5, 10, 25, 50, 100]);

  const productRes = await fetch(`${DRUPAL_API}/jsonapi/commerce_product/donation`, {
    method: "POST",
    headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify({
      data: {
        type: "commerce_product--donation",
        attributes: {
          title,
          status: true,
          field_campaign_description: description
            ? { value: description, format: "basic_html" }
            : null,
          field_goal_amount: String(goalAmount),
          field_campaign_image_url: imageUrl || null,
          field_campaign_category: category || null,
          field_campaign_end_date: endDate || null,
          field_min_donation: String(minDonation || 1),
          field_suggested_amounts: suggestedJson,
          field_donor_wall_enabled: donorWallEnabled !== false,
          field_allow_anonymous: allowAnonymous !== false,
          field_thank_you_message: thankYouMessage
            ? { value: thankYouMessage, format: "basic_html" }
            : null,
        },
        relationships: {
          variations: { data: [{ type: "commerce_product_variation--donation", id: variationId }] },
          stores: { data: [{ type: "commerce_store--online", id: storeId }] },
        },
      },
    }),
  });

  if (!productRes.ok) {
    const text = await productRes.text();
    return NextResponse.json({ error: `Campaign creation failed: ${text}` }, { status: 500 });
  }

  const productJson = await productRes.json();
  return NextResponse.json({
    success: true,
    campaignId: productJson.data.id,
    title,
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function mapCampaign(product: any, included: any[]): DonationCampaign {
  const attrs = product.attributes;
  const storeRef = product.relationships?.stores?.data?.[0];
  const store = storeRef
    ? included.find((inc: any) => inc.id === storeRef.id)
    : null;

  let suggestedAmounts: number[] = [5, 10, 25, 50, 100];
  try {
    const raw = attrs.field_suggested_amounts;
    if (raw) suggestedAmounts = JSON.parse(raw);
  } catch { /* use defaults */ }

  return {
    id: product.id,
    drupalId: attrs.drupal_internal__product_id,
    title: attrs.title,
    description:
      attrs.field_campaign_description?.processed ||
      attrs.field_campaign_description?.value ||
      "",
    goalAmount: parseFloat(attrs.field_goal_amount) || 0,
    raisedAmount: 0, // TODO: calculate from completed orders
    donorCount: 0, // TODO: calculate from completed orders
    imageUrl: attrs.field_campaign_image_url || null,
    category: attrs.field_campaign_category || null,
    endDate: attrs.field_campaign_end_date || null,
    minDonation: parseFloat(attrs.field_min_donation) || 1,
    suggestedAmounts,
    donorWallEnabled: attrs.field_donor_wall_enabled ?? true,
    allowAnonymous: attrs.field_allow_anonymous ?? true,
    thankYouMessage:
      attrs.field_thank_you_message?.processed ||
      attrs.field_thank_you_message?.value ||
      null,
    storeSlug: store?.attributes?.field_store_slug || "",
    creatorUsername: "",
  };
}
