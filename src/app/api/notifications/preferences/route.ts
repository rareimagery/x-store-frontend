import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { drupalAuthHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

/** Look up Drupal user UUID by email. */
async function getDrupalUserByEmail(
  email: string
): Promise<{ id: string; attributes: Record<string, unknown> } | null> {
  const res = await fetch(
    `${DRUPAL_API}/jsonapi/user/user?filter[mail]=${encodeURIComponent(email)}`,
    { headers: { ...drupalAuthHeaders() } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.data?.[0] ?? null;
}

/**
 * GET /api/notifications/preferences
 * Fetch the current user's notification preferences from Drupal.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const drupalUser = await getDrupalUserByEmail(token.email);
  if (!drupalUser) {
    return NextResponse.json(
      { error: "Drupal user not found" },
      { status: 404 }
    );
  }

  const attrs = drupalUser.attributes || {};

  return NextResponse.json({
    phoneNumber: (attrs.field_phone_number as string) || "",
    notificationChannel:
      (attrs.field_notification_channel as string) || "email",
    smsAlertLevel: (attrs.field_sms_alert_level as string) || "all",
  });
}

/**
 * PATCH /api/notifications/preferences
 * Update the current user's notification preferences.
 */
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { phoneNumber, notificationChannel, smsAlertLevel } = body;

  // Validate notification channel
  const validChannels = ["email", "email_sms"];
  if (notificationChannel && !validChannels.includes(notificationChannel)) {
    return NextResponse.json(
      { error: "Invalid notification channel" },
      { status: 400 }
    );
  }

  // Validate SMS alert level
  const validLevels = ["all", "sales", "critical"];
  if (smsAlertLevel && !validLevels.includes(smsAlertLevel)) {
    return NextResponse.json(
      { error: "Invalid SMS alert level" },
      { status: 400 }
    );
  }

  // Validate phone number format (E.164)
  if (phoneNumber && !/^\+[1-9]\d{6,14}$/.test(phoneNumber)) {
    return NextResponse.json(
      { error: "Phone number must be in E.164 format (e.g. +15551234567)" },
      { status: 400 }
    );
  }

  const drupalUser = await getDrupalUserByEmail(token.email);
  if (!drupalUser) {
    return NextResponse.json(
      { error: "Drupal user not found" },
      { status: 404 }
    );
  }

  const attributes: Record<string, string | null> = {};
  if (phoneNumber !== undefined)
    attributes.field_phone_number = phoneNumber || null;
  if (notificationChannel !== undefined)
    attributes.field_notification_channel = notificationChannel;
  if (smsAlertLevel !== undefined)
    attributes.field_sms_alert_level = smsAlertLevel;

  const res = await fetch(
    `${DRUPAL_API}/jsonapi/user/user/${drupalUser.id}`,
    {
      method: "PATCH",
      headers: {
        ...drupalAuthHeaders(),
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "user--user",
          id: drupalUser.id,
          attributes,
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Update failed: ${res.status} — ${text.slice(0, 200)}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
