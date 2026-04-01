import { NextRequest, NextResponse } from "next/server";

import { drupalAuthHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId");
  const slug = req.nextUrl.searchParams.get("slug");

  if (!DRUPAL_API) return NextResponse.json({ connected: false });

  try {
    let storeData: any = null;

    if (storeId) {
      const res = await fetch(
        `${DRUPAL_API}/jsonapi/commerce_store/online/${storeId}`,
        { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
      );
      if (res.ok) storeData = (await res.json()).data;
    } else if (slug) {
      const res = await fetch(
        `${DRUPAL_API}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_printful_store_id,field_printful_api_key`,
        { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
      );
      if (res.ok) storeData = (await res.json()).data?.[0];
    }

    if (!storeData) return NextResponse.json({ connected: false });

    const printfulStoreId = storeData.attributes?.field_printful_store_id || null;
    const hasKey = !!storeData.attributes?.field_printful_api_key;

    return NextResponse.json({
      connected: hasKey,
      printful_store_id: printfulStoreId,
      store_uuid: storeData.id,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
