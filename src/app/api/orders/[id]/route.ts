import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [orderRes, shipmentsRes] = await Promise.all([
      fetch(
        `${DRUPAL_API}/jsonapi/commerce_order/default/${id}?include=order_items,billing_profile`,
        { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
      ),
      fetch(
        `${DRUPAL_API}/jsonapi/commerce_shipment/default?filter[order_id.id]=${id}&include=shipping_method`,
        { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
      ),
    ]);

    if (!orderRes.ok) {
      return NextResponse.json({ error: "Order not found" }, { status: orderRes.status });
    }

    const json = await orderRes.json();
    const order = json.data;
    const included = json.included || [];

    const billingProfileRef = order.relationships?.billing_profile?.data;
    const billingProfile = billingProfileRef
      ? included.find((i: any) => i.id === billingProfileRef.id)
      : null;

    const itemRefs = order.relationships?.order_items?.data || [];
    const items = itemRefs
      .map((ref: any) => included.find((i: any) => i.id === ref.id))
      .filter(Boolean);

    // Shipments fetched separately (not a field on the order entity)
    let shipments: any[] = [];
    if (shipmentsRes.ok) {
      const shipmentsJson = await shipmentsRes.json();
      const sIncluded = shipmentsJson.included || [];
      shipments = (shipmentsJson.data || []).map((shipment: any) => {
        const methodRef = shipment.relationships?.shipping_method?.data;
        const method = methodRef
          ? sIncluded.find((i: any) => i.id === methodRef.id)
          : null;
        return {
          id: shipment.id,
          state: shipment.attributes?.state,
          trackingCode: shipment.attributes?.tracking_code,
          amount: shipment.attributes?.amount?.number,
          currency: shipment.attributes?.amount?.currency_code,
          shippingMethod: method?.attributes?.name || null,
          shippingAddress: shipment.attributes?.shipping_profile?.address || null,
        };
      });
    }

    return NextResponse.json({
      id: order.id,
      drupalId: order.attributes?.drupal_internal__order_id,
      orderNumber: order.attributes?.order_number,
      state: order.attributes?.state,
      email: order.attributes?.mail,
      placedAt: order.attributes?.placed,
      completedAt: order.attributes?.completed,
      total: order.attributes?.total_price?.number,
      currency: order.attributes?.total_price?.currency_code,
      subtotal: null,
      adjustments: order.attributes?.adjustments || [],
      billingAddress: billingProfile?.attributes?.address || null,
      customerName: [
        billingProfile?.attributes?.address?.given_name,
        billingProfile?.attributes?.address?.family_name,
      ].filter(Boolean).join(" ") || order.attributes?.mail || "Unknown",
      items: items.map((item: any) => ({
        id: item.id,
        title: item.attributes?.title,
        quantity: item.attributes?.quantity,
        unitPrice: item.attributes?.unit_price?.number,
        totalPrice: item.attributes?.total_price?.number,
        currency: item.attributes?.total_price?.currency_code,
        purchasedEntityType: item.attributes?.purchased_entity_type,
      })),
      shipments,
    });
  } catch (err) {
    console.error("Order detail API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update order state (e.g., cancel)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const writeHeaders = await drupalWriteHeaders();

    const res = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_order/default/${id}`,
      {
        method: "PATCH",
        headers: {
          ...writeHeaders,
          "Content-Type": "application/vnd.api+json",
        },
        body: JSON.stringify({
          data: {
            type: "commerce_order--default",
            id: id,
            attributes: body.attributes,
          },
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Order PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
