import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { drupalAuthHeaders } from "@/lib/drupal";
import { verifyStoreOwnership } from "@/lib/ownership";

const DRUPAL_API = process.env.DRUPAL_API_URL;

type JsonApiEntity = {
  id: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: JsonApiEntityRef | JsonApiEntityRef[] | null }>;
};

type JsonApiEntityRef = {
  id: string;
};

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const status = searchParams.get("status"); // pending, completed, cancelled, all
  const page = searchParams.get("page") || "0";

  if (!storeId) {
    return NextResponse.json({ error: "storeId required" }, { status: 400 });
  }

  if (!(await verifyStoreOwnership(token, storeId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const filters = [`filter[store_id.id]=${storeId}`];
    if (status && status !== "all") {
      filters.push(`filter[state]=${status}`);
    }

    const url = [
      `${DRUPAL_API}/jsonapi/commerce_order/default`,
      `?${filters.join("&")}`,
      `&include=order_items,billing_profile`,
      `&sort=-placed`,
      `&page[offset]=${parseInt(page, 10) * 20}&page[limit]=20`,
    ].join("");

    const res = await fetch(url, {
      headers: { ...drupalAuthHeaders() },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Drupal orders fetch failed:", text);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: res.status });
    }

    const json = await res.json();
    const included: JsonApiEntity[] = json.included || [];
    const orders = ((json.data as JsonApiEntity[]) || []).map((order) => {
      const billingProfileRef = order.relationships?.billing_profile?.data;
      const billingProfile = billingProfileRef
        ? included.find((i) => i.id === (billingProfileRef as JsonApiEntityRef).id)
        : null;

      const itemRefs = (order.relationships?.order_items?.data as JsonApiEntityRef[] | undefined) || [];
      const items = itemRefs
        .map((ref) => included.find((i) => i.id === ref.id))
        .filter((item): item is JsonApiEntity => Boolean(item));

      const orderAttributes = order.attributes || {};
      const billingAddress = (billingProfile?.attributes?.["address"] as Record<string, unknown> | undefined) || null;

      return {
        id: order.id,
        drupalId: orderAttributes["drupal_internal__order_id"],
        orderNumber: orderAttributes["order_number"],
        state: orderAttributes["state"],
        email: orderAttributes["mail"],
        placedAt: orderAttributes["placed"],
        completedAt: orderAttributes["completed"],
        total: (orderAttributes["total_price"] as Record<string, unknown> | undefined)?.["number"],
        currency: (orderAttributes["total_price"] as Record<string, unknown> | undefined)?.["currency_code"],
        subtotal: null,
        billingAddress,
        customerName: [
          billingAddress?.["given_name"],
          billingAddress?.["family_name"],
        ].filter(Boolean).join(" ") || String(orderAttributes["mail"] || "Unknown"),
        itemCount: items.length,
        items: items.map((item) => ({
          id: item.id,
          title: item.attributes?.["title"],
          quantity: item.attributes?.["quantity"],
          unitPrice: (item.attributes?.["unit_price"] as Record<string, unknown> | undefined)?.["number"],
          totalPrice: (item.attributes?.["total_price"] as Record<string, unknown> | undefined)?.["number"],
          currency: (item.attributes?.["total_price"] as Record<string, unknown> | undefined)?.["currency_code"],
        })),
      };
    });

    return NextResponse.json({
      orders,
      total: json.meta?.count || orders.length,
      page: parseInt(page, 10),
    });
  } catch (err) {
    console.error("Orders API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
