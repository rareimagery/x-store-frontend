import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRequiredPaidSubscription } from "@/lib/x-subscription";
import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import {
  createImportSnapshot,
  updateImportSnapshot,
} from "@/lib/x-import";
import { triggerDrupalSync } from "@/lib/drupal-sync";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { ensureStoreSubdomainDns } from "@/lib/cloudflare";
import { randomUUID } from "crypto";

const DRUPAL_API = process.env.DRUPAL_API_URL;

async function profileExists(username: string): Promise<string | null> {
  const res = await fetch(
    `${DRUPAL_API}/jsonapi/node/x_user_profile?filter[field_x_username]=${username}`,
    { headers: { ...drupalAuthHeaders() } }
  );
  if (!res.ok) return null;
  const json = await res.json();
  if (json.data?.length > 0) return json.data[0].id;
  return null;
}

async function createDrupalUser(username: string): Promise<string | null> {
  try {
    const writeHeaders = await drupalWriteHeaders();
    const res = await fetch(`${DRUPAL_API}/jsonapi/user/user`, {
      method: "POST",
      headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: {
          type: "user--user",
          attributes: {
            name: username,
            mail: `${username.toLowerCase()}@rareimagery.net`,
            status: true,
            pass: { value: `ri_${username}_${Date.now()}` },
          },
        },
      }),
    });
    if (res.ok) {
      const json = await res.json();
      console.log(`[provision] Created Drupal user for @${username}: uid ${json.data?.attributes?.drupal_internal__uid}`);
      return json.data?.id ?? null;
    }
    console.warn(`[provision] Drupal user creation failed (${res.status}) — continuing without user`);
    return null;
  } catch (err) {
    console.warn("[provision] Drupal user creation error:", err);
    return null;
  }
}

async function createProfile(
  username: string,
  xId: string,
): Promise<{ id: string }> {
  // Create Drupal user first
  const userUuid = await createDrupalUser(username);

  const writeHeaders = await drupalWriteHeaders();

  const attributes: Record<string, any> = {
    title: username,
    field_x_username: username,
    field_x_user_id: xId,
    field_store_theme: "xai3",
  };

  const relationships: Record<string, any> = {};
  if (userUuid) {
    relationships.uid = { data: { type: "user--user", id: userUuid } };
  }

  const res = await fetch(`${DRUPAL_API}/jsonapi/node/x_user_profile`, {
    method: "POST",
    headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify({
      data: { type: "node--x_user_profile", attributes, ...(Object.keys(relationships).length > 0 ? { relationships } : {}) },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create profile: ${text}`);
  }

  const json = await res.json();
  return { id: json.data.id };
}

const provisionLimit = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 }); // 5/hour

async function provisionStoreDns(slug: string) {
  try {
    const dns = await ensureStoreSubdomainDns(slug);
    if (!dns.configured) {
      console.log(`[cloudflare] DNS automation skipped for ${dns.hostname}`);
    }
  } catch (error) {
    console.error(`[cloudflare] DNS automation failed for ${slug}:`, error);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const agreedToTerms = Boolean(body?.agreedToTerms);

  if (!agreedToTerms) {
    return NextResponse.json(
      { error: "You must agree to the Terms of Service, EULA, and Privacy Policy" },
      { status: 400 }
    );
  }

  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json(
      { error: "Sign in with X first" },
      { status: 401 }
    );
  }

  const userId = (token.xId as string) || (token.sub as string) || "anon";
  const rl = provisionLimit(userId);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const xUsername = token.xUsername as string;
  const xId = token.xId as string;
  const importRunId = randomUUID();
  const snapshotUuid = await createImportSnapshot({
    xUsername,
    xUserId: xId,
    runId: importRunId,
    status: "pending",
  });

  if (!xUsername || !xId) {
    return NextResponse.json(
      { error: "Missing X account info — please sign in again" },
      { status: 400 }
    );
  }

  // Check if profile already exists
  const existingId = await profileExists(xUsername);
  if (existingId) {
    await provisionStoreDns(xUsername);
    if (snapshotUuid) {
      await updateImportSnapshot(snapshotUuid, {
        status: "success",
        profileUuid: existingId,
      });
    }
    return NextResponse.json({
      success: true,
      profileId: existingId,
      alreadyExisted: true,
      url: `https://www.rareimagery.net/${xUsername}`,
    });
  }

  {
    const { subscribed, error } = await checkRequiredPaidSubscription({
      buyerXId: xId,
      buyerUsername: xUsername,
    });
    if (!subscribed) {
      if (snapshotUuid) {
        await updateImportSnapshot(snapshotUuid, {
          status: "failed",
          errorMessage:
            error ||
            "An active paid X subscription is required to create your RareImagery account.",
        });
      }
      return NextResponse.json(
        {
          error: error || "An active paid X subscription is required to create your RareImagery account.",
          requiresPaidSubscription: true,
        },
        { status: 403 }
      );
    }
  }

  try {
    // Create minimal profile node — Drupal will populate X data via sync.
    const profile = await createProfile(xUsername, xId);
    await provisionStoreDns(xUsername);

    if (snapshotUuid) {
      await updateImportSnapshot(snapshotUuid, {
        status: "success",
        profileUuid: profile.id,
      });
    }

    // Tell Drupal to sync X data (Drupal owns X API calls, images, metrics).
    triggerDrupalSync(xUsername).catch((err) =>
      console.error(`[provision] Drupal sync trigger failed for @${xUsername}:`, err)
    );

    return NextResponse.json({
      success: true,
      profileId: profile.id,
      alreadyExisted: false,
      url: `https://www.rareimagery.net/${xUsername}`,
    });
  } catch (err: any) {
    if (snapshotUuid) {
      await updateImportSnapshot(snapshotUuid, {
        status: "failed",
        errorMessage: err?.message || "Provision failed",
      });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
