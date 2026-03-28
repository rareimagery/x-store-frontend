import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { verifyStoreOwnership, isValidUUID } from "@/lib/ownership";
import { getStorePrintfulKey, setupWebhooks, getWebhooks } from "@/lib/printful";

function hasWebhookUrl(value: unknown): value is { url?: string } {
  return typeof value === "object" && value !== null && "url" in value;
}

/**
 * POST /api/printful/webhook/setup
 * Register webhook URL with Printful for the store's events.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { storeId } = await req.json();

    if (!storeId || !isValidUUID(storeId)) {
      return NextResponse.json({ error: "Valid storeId required" }, { status: 400 });
    }

    if (!(await verifyStoreOwnership(token, storeId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const apiKey = await getStorePrintfulKey(storeId);
    if (!apiKey) {
      return NextResponse.json(
        { error: "Printful not connected for this store" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://rareimagery.net";
    const webhookUrl = `${baseUrl}/api/printful/webhook`;

    const result = await setupWebhooks(apiKey, webhookUrl);

    return NextResponse.json({ success: true, webhook: result });
  } catch (err: any) {
    console.error("Webhook setup error:", err.message);
    return NextResponse.json(
      { error: err.message || "Webhook setup failed" },
      { status: err.code || 500 }
    );
  }
}

/**
 * GET /api/printful/webhook/setup?storeId=...
 * Check current webhook configuration.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storeId = req.nextUrl.searchParams.get("storeId");

  if (!storeId || !isValidUUID(storeId)) {
    return NextResponse.json({ error: "Valid storeId required" }, { status: 400 });
  }

  if (!(await verifyStoreOwnership(token, storeId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const apiKey = await getStorePrintfulKey(storeId);
    if (!apiKey) {
      return NextResponse.json({ configured: false });
    }

    const webhook = await getWebhooks(apiKey);
    const configured = hasWebhookUrl(webhook) && typeof webhook.url === "string";
    return NextResponse.json({ configured, webhook });
  } catch (err: any) {
    return NextResponse.json({ configured: false });
  }
}
