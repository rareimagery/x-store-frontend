// ---------------------------------------------------------------------------
// X Subscription Check — raw fetch per x-api-integration.md
// ---------------------------------------------------------------------------

import { X_API_BASE } from "@/lib/x-api/client";
import { fetchWithRetry } from "@/lib/x-api/fetch-with-retry";
import { drupalAuthHeaders } from "@/lib/drupal";
import { isFreeSubscriptionAllowlisted } from "@/lib/subscription-allowlist";

const DEFAULT_REQUIRED_X_USERNAME = "rareimagery";
const DRUPAL_API = process.env.DRUPAL_API_URL;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due", "paid"]);

function requiredUsernameFromEnv(): string {
  const raw = process.env.REQUIRED_X_CREATOR_USERNAME?.trim();
  return (raw || DEFAULT_REQUIRED_X_USERNAME).replace(/^@+/, "").toLowerCase();
}

function requiredStoreIdFromEnv(): string {
  return process.env.REQUIRED_X_CREATOR_STORE_ID?.trim() || "";
}

async function resolveRequiredCreatorStoreId(requiredUsername: string): Promise<string | null> {
  const configuredStoreId = requiredStoreIdFromEnv();
  if (configuredStoreId) {
    return configuredStoreId;
  }

  if (!DRUPAL_API) {
    return null;
  }

  const usernameCandidates = Array.from(
    new Set([
      requiredUsername,
      requiredUsername.toLowerCase(),
      requiredUsername.replace(/^@+/, ""),
      requiredUsername.replace(/^@+/, "").toLowerCase(),
    ].filter(Boolean))
  );

  for (const candidate of usernameCandidates) {
    const params = new URLSearchParams({
      "filter[field_x_username]": candidate,
    });

    const endpoint = `${DRUPAL_API}/jsonapi/node/x_user_profile?${params.toString()}`;
    const res: Response = await fetch(
      endpoint,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Drupal endpoint not found (404): ${endpoint}`);
      }
      continue;
    }

    const json = await res.json();
    const profile = json.data?.[0];
    const storeId = profile?.relationships?.field_linked_store?.data?.id;
    if (typeof storeId === "string" && storeId.length > 0) {
      return storeId;
    }
  }

  return null;
}

function buildBuyerIdentityKeys(buyerXId?: string | null, buyerUsername?: string | null): string[] {
  const username = buyerUsername?.trim().replace(/^@+/, "") || "";
  const lowered = username.toLowerCase();

  return Array.from(
    new Set([
      buyerXId?.trim() || "",
      username,
      lowered,
      username ? `@${username}` : "",
      lowered ? `@${lowered}` : "",
    ].filter(Boolean))
  );
}

type PaidSubscriptionCheckInput = {
  buyerXId?: string | null;
  buyerUsername?: string | null;
  requiredUsername?: string;
};

type StoreSubscriptionNode = {
  attributes?: {
    field_subscription_status?: string;
    field_tier_id?: string | null;
  };
};

export async function checkRequiredPaidSubscription({
  buyerXId,
  buyerUsername,
  requiredUsername = requiredUsernameFromEnv(),
}: PaidSubscriptionCheckInput): Promise<{
  subscribed: boolean;
  tier?: string | null;
  storeId?: string;
  error?: string;
}> {
  try {
    if (isFreeSubscriptionAllowlisted({ xId: buyerXId || null, xUsername: buyerUsername || null })) {
      return {
        subscribed: true,
        tier: "helper_free",
      };
    }

    if (!DRUPAL_API) {
      return { subscribed: false, error: "Drupal API URL is not configured." };
    }

    const buyerKeys = buildBuyerIdentityKeys(buyerXId, buyerUsername);

    if (buyerKeys.length === 0) {
      return { subscribed: false, error: "Missing buyer identity for subscription check." };
    }

    const requiredStoreId = await resolveRequiredCreatorStoreId(requiredUsername);
    if (!requiredStoreId) {
      return {
        subscribed: false,
        error: `Required creator store is not configured for @${requiredUsername}.`,
      };
    }

    for (const buyerKey of buyerKeys) {
      const params = new URLSearchParams({
        "filter[field_buyer_x_id]": buyerKey,
        "filter[field_store_id]": requiredStoreId,
      });

      const endpoint = `${DRUPAL_API}/jsonapi/node/store_subscription?${params.toString()}`;
      const res = await fetch(
        endpoint,
        { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
      );

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`Drupal endpoint not found (404): ${endpoint}`);
        }
        continue;
      }

      const json = await res.json();
      const subscriptions: StoreSubscriptionNode[] = Array.isArray(json.data) ? json.data : [];
      const activeSub = subscriptions.find((sub) => {
        const status = String(sub?.attributes?.field_subscription_status ?? "").toLowerCase();
        return ACTIVE_SUBSCRIPTION_STATUSES.has(status);
      });

      if (activeSub) {
        const attrs = activeSub?.attributes || {};
        return {
          subscribed: true,
          tier: attrs.field_tier_id ?? null,
          storeId: requiredStoreId,
        };
      }
    }

    return {
      subscribed: false,
      storeId: requiredStoreId,
      error: `Active paid subscription required for @${requiredUsername}.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Subscription check failed.";
    console.error("Paid subscription check error:", err);
    return { subscribed: false, error: message };
  }
}

/**
 * Check if a user follows @rareimagery on X.
 * Uses user-context OAuth 2.0 access token to read following list.
 */
export async function checkXSubscription(
  accessToken: string,
  userId: string,
  requiredUsername = requiredUsernameFromEnv()
): Promise<{ subscribed: boolean; error?: string }> {
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const params = new URLSearchParams({
      max_results: "1000",
      "user.fields": "username",
    });

    const res = await fetchWithRetry(
      `${X_API_BASE}/users/${encodeURIComponent(userId)}/following?${params}`,
      { headers }
    );

    if (!res.ok) {
      if (res.status === 401) {
        return { subscribed: false, error: "X token expired — please sign in again" };
      }
      return { subscribed: false, error: `X API error ${res.status}` };
    }

    const json = await res.json();
    const following: Array<{ username?: string }> = json.data ?? [];

    if (
      following.some(
        (user) =>
          user.username?.toLowerCase() === requiredUsername
      )
    ) {
      return { subscribed: true };
    }

    // Paginate if needed
    let nextToken: string | undefined = json.meta?.next_token;
    while (nextToken) {
      const pageParams = new URLSearchParams({
        max_results: "1000",
        "user.fields": "username",
        pagination_token: nextToken,
      });

      const pageRes = await fetchWithRetry(
        `${X_API_BASE}/users/${encodeURIComponent(userId)}/following?${pageParams}`,
        { headers }
      );

      if (!pageRes.ok) break;

      const pageJson = await pageRes.json();
      const pageData: Array<{ username?: string }> = pageJson.data ?? [];

      if (
        pageData.some(
          (user) =>
            user.username?.toLowerCase() === requiredUsername
        )
      ) {
        return { subscribed: true };
      }
      nextToken = pageJson.meta?.next_token;
    }

    return { subscribed: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "X subscription check failed";
    console.error("X subscription check error:", err);
    return { subscribed: false, error: message };
  }
}
