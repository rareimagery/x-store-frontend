// ---------------------------------------------------------------------------
// X Webhook Handler — CRC validation (GET) + Event delivery (POST)
// Per x-api-integration.md Section 9.3
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { processWebhookEvent } from "@/lib/webhooks/process-event";
import type { XWebhookEvent } from "@/lib/x-api/types";

const CONSUMER_SECRET = process.env.X_API_CONSUMER_SECRET;

// ─── CRC Validation (X calls this hourly + on registration) ─────────────────

export async function GET(req: NextRequest) {
  if (!CONSUMER_SECRET) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const crcToken = req.nextUrl.searchParams.get("crc_token");
  if (!crcToken) {
    return NextResponse.json({ error: "Missing crc_token" }, { status: 400 });
  }

  const hmac = crypto
    .createHmac("sha256", CONSUMER_SECRET)
    .update(crcToken)
    .digest("base64");

  return NextResponse.json({ response_token: `sha256=${hmac}` });
}

// ─── Event Delivery ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!CONSUMER_SECRET) {
    return new NextResponse(null, { status: 500 });
  }

  // 1. Verify signature BEFORE reading the body
  const signature = req.headers.get("x-twitter-webhooks-signature");
  if (!signature) {
    return new NextResponse(null, { status: 401 });
  }

  const rawBody = await req.text();

  if (!verifySignature(rawBody, signature)) {
    return new NextResponse(null, { status: 401 });
  }

  // 2. Parse and route — process async, respond 200 immediately (X requires < 10s)
  const event = JSON.parse(rawBody) as XWebhookEvent;

  processWebhookEvent(event).catch((err) =>
    console.error("[Webhook] Processing error:", err)
  );

  return new NextResponse(null, { status: 200 });
}

// ─── Signature Verification ─────────────────────────────────────────────────

function verifySignature(rawBody: string, signatureHeader: string): boolean {
  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", CONSUMER_SECRET!)
      .update(rawBody)
      .digest("base64");

  // Constant-time comparison prevents timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signatureHeader)
    );
  } catch {
    return false; // length mismatch
  }
}
