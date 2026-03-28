import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { drupalAuthHeaders } from "@/lib/drupal";
import { verifyStoreOwnership } from "@/lib/ownership";
import { getStripeClient } from "@/lib/stripe";

const DRUPAL_API = process.env.DRUPAL_API_URL;
const PLATFORM_FEE_RATE = 0.029;
const PLATFORM_FEE_FLAT = 0.30;

type AttributionRow = {
  source: string;
  orders: number;
  revenue: number;
};

type DrupalOrder = {
  id: string;
  attributes?: {
    total_price?: { number?: string };
    placed?: string;
    order_number?: string;
    mail?: string;
  };
};

async function getStripeAttribution(storeId: string, sinceTs: number): Promise<AttributionRow[]> {
  if (!process.env.STRIPE_SECRET_KEY) return [];

  try {
    const stripe = getStripeClient();
    const rows: Record<string, { orders: number; revenue: number }> = {};
    let startingAfter: string | undefined;

    for (let page = 0; page < 4; page++) {
      const sessions = await stripe.checkout.sessions.list({
        created: { gte: sinceTs },
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      for (const session of sessions.data) {
        if (session.payment_status !== "paid") continue;
        if (session.metadata?.type !== "product_purchase") continue;
        if (session.metadata?.store_id !== storeId) continue;

        const source =
          session.metadata?.attr_utm_source?.trim() ||
          session.metadata?.attr_referrer?.trim() ||
          "direct";
        if (!rows[source]) rows[source] = { orders: 0, revenue: 0 };

        rows[source].orders += 1;
        rows[source].revenue += (session.amount_total ?? 0) / 100;
      }

      if (!sessions.has_more || sessions.data.length === 0) break;
      startingAfter = sessions.data[sessions.data.length - 1]?.id;
      if (!startingAfter) break;
    }

    return Object.entries(rows)
      .map(([source, value]) => ({ source, orders: value.orders, revenue: value.revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  } catch (error) {
    console.warn("Failed to compute Stripe attribution:", error);
    return [];
  }
}

function toCsv(data: {
  period: number;
  grossRevenue: number;
  platformFees: number;
  netRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  pendingOrderCount: number;
  pendingValue: number;
  storeStatus: string;
  storeCreatedAt: string | null;
  firstSaleAt: string | null;
  timeToFirstSaleHours: number | null;
  attribution: AttributionRow[];
}) {
  const header = "metric,value";
  const rows = [
    ["period_days", data.period],
    ["gross_revenue", data.grossRevenue],
    ["platform_fees", data.platformFees],
    ["net_revenue", data.netRevenue],
    ["order_count", data.orderCount],
    ["avg_order_value", data.avgOrderValue],
    ["pending_order_count", data.pendingOrderCount],
    ["pending_value", data.pendingValue],
    ["store_status", data.storeStatus],
    ["store_created_at", data.storeCreatedAt ?? ""],
    ["first_sale_at", data.firstSaleAt ?? ""],
    ["time_to_first_sale_hours", data.timeToFirstSaleHours ?? ""],
  ]
    .map(([k, v]) => `${k},${String(v)}`)
    .join("\n");

  const attributionHeader = "\n\nsource,orders,revenue";
  const attributionRows = data.attribution
    .map((row) => `${row.source},${row.orders},${row.revenue.toFixed(2)}`)
    .join("\n");

  return `${header}\n${rows}${attributionHeader}${attributionRows ? `\n${attributionRows}` : ""}`;
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const period = searchParams.get("period") || "30"; // days
  const format = searchParams.get("format") || "json";

  if (!storeId) {
    return NextResponse.json({ error: "storeId required" }, { status: 400 });
  }

  if (!(await verifyStoreOwnership(token, storeId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Fetch completed orders within the period
    // placed is a Unix timestamp field — filter using named condition format
    const sinceTs = Math.floor((Date.now() - parseInt(period) * 24 * 60 * 60 * 1000) / 1000);

    const completedUrl = [
      `${DRUPAL_API}/jsonapi/commerce_order/default`,
      `?filter[store_id.id]=${storeId}`,
      `&filter[state_filter][condition][path]=state`,
      `&filter[state_filter][condition][value]=completed`,
      `&filter[placed_filter][condition][path]=placed`,
      `&filter[placed_filter][condition][operator]=%3E%3D`,
      `&filter[placed_filter][condition][value]=${sinceTs}`,
      `&page[limit]=200`,
      `&sort=-placed`,
    ].join("");

    const pendingUrl = [
      `${DRUPAL_API}/jsonapi/commerce_order/default`,
      `?filter[store_id.id]=${storeId}`,
      `&filter[state]=pending`,
      `&page[limit]=50`,
    ].join("");

    const firstSaleUrl = [
      `${DRUPAL_API}/jsonapi/commerce_order/default`,
      `?filter[store_id.id]=${storeId}`,
      `&filter[state_filter][condition][path]=state`,
      `&filter[state_filter][condition][value]=completed`,
      `&sort=placed`,
      `&page[limit]=1`,
    ].join("");

    const storeUrl = `${DRUPAL_API}/jsonapi/commerce_store/online/${storeId}`;

    const [completedRes, pendingRes, firstSaleRes, storeRes] = await Promise.all([
      fetch(completedUrl, { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }),
      fetch(pendingUrl, { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }),
      fetch(firstSaleUrl, { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }),
      fetch(storeUrl, { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }),
    ]);

    const completedJson = completedRes.ok ? await completedRes.json() : { data: [] };
    const pendingJson = pendingRes.ok ? await pendingRes.json() : { data: [] };
    const firstSaleJson = firstSaleRes.ok ? await firstSaleRes.json() : { data: [] };
    const storeJson = storeRes.ok ? await storeRes.json() : { data: null };

    const completedOrders: DrupalOrder[] = completedJson.data || [];
    const pendingOrders: DrupalOrder[] = pendingJson.data || [];
    const firstSale: DrupalOrder | undefined = (firstSaleJson.data || [])[0];
    const storeData = storeJson.data;

    // Aggregate revenue metrics
    let grossRevenue = 0;
    let platformFees = 0;
    const orderCount = completedOrders.length;
    const dailyRevenue: Record<string, number> = {};

    for (const order of completedOrders) {
      const total = parseFloat(order.attributes?.total_price?.number || "0");
      grossRevenue += total;

      const fee = total * PLATFORM_FEE_RATE + PLATFORM_FEE_FLAT;
      platformFees += fee;

      // Group by day
      const day = order.attributes?.placed?.split("T")[0];
      if (day) {
        dailyRevenue[day] = (dailyRevenue[day] || 0) + total;
      }
    }

    const netRevenue = grossRevenue - platformFees;
    const avgOrderValue = orderCount > 0 ? grossRevenue / orderCount : 0;

    const storeCreatedAt: string | null = storeData?.attributes?.created ?? null;
    const firstSaleAt: string | null = firstSale?.attributes?.placed ?? null;
    const storeStatus: string = storeData?.attributes?.field_store_status ?? "unknown";
    const timeToFirstSaleHours =
      storeCreatedAt && firstSaleAt
        ? parseFloat(
            (
              (new Date(firstSaleAt).getTime() - new Date(storeCreatedAt).getTime()) /
              (1000 * 60 * 60)
            ).toFixed(1)
          )
        : null;

    const attribution = await getStripeAttribution(storeId, sinceTs);

    // Build daily chart data for the period
    const chartData: { date: string; revenue: number }[] = [];
    for (let i = parseInt(period) - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      chartData.push({ date: key, revenue: dailyRevenue[key] || 0 });
    }

    // Pending orders value
    const pendingValue = pendingOrders.reduce((sum: number, o: DrupalOrder) => {
      return sum + parseFloat(o.attributes?.total_price?.number || "0");
    }, 0);

    const responsePayload = {
      period: parseInt(period),
      currency: "USD",
      grossRevenue: parseFloat(grossRevenue.toFixed(2)),
      platformFees: parseFloat(platformFees.toFixed(2)),
      netRevenue: parseFloat(netRevenue.toFixed(2)),
      orderCount,
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      pendingOrderCount: pendingOrders.length,
      pendingValue: parseFloat(pendingValue.toFixed(2)),
      chartData,
      recentOrders: completedOrders.slice(0, 5).map((o: DrupalOrder) => ({
        id: o.id,
        orderNumber: o.attributes?.order_number,
        email: o.attributes?.mail,
        total: o.attributes?.total_price?.number,
        placedAt: o.attributes?.placed,
      })),
      conversion: {
        storeStatus,
        activated: storeStatus === "approved" || storeStatus === "active",
        hasFirstSale: !!firstSaleAt,
        storeCreatedAt,
        firstSaleAt,
        timeToFirstSaleHours,
      },
      attribution,
    };

    if (format === "csv") {
      const csv = toCsv({
        period: responsePayload.period,
        grossRevenue: responsePayload.grossRevenue,
        platformFees: responsePayload.platformFees,
        netRevenue: responsePayload.netRevenue,
        orderCount: responsePayload.orderCount,
        avgOrderValue: responsePayload.avgOrderValue,
        pendingOrderCount: responsePayload.pendingOrderCount,
        pendingValue: responsePayload.pendingValue,
        storeStatus,
        storeCreatedAt,
        firstSaleAt,
        timeToFirstSaleHours,
        attribution,
      });
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=accounting-${storeId}-${period}d.csv`,
        },
      });
    }

    return NextResponse.json(responsePayload);
  } catch (err) {
    console.error("Accounting API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
