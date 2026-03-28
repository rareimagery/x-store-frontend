import { NextRequest, NextResponse } from "next/server";

import { drupalAuthHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId");

  if (!storeId || !DRUPAL_API) {
    return NextResponse.json({ connected: false });
  }

  try {
    const res = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_store/online/${storeId}`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );

    if (!res.ok) {
      return NextResponse.json({ connected: false });
    }

    const json = await res.json();
    const printfulStoreId =
      json.data?.attributes?.field_printful_store_id || null;

    return NextResponse.json({
      connected: !!printfulStoreId,
      printful_store_id: printfulStoreId,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
