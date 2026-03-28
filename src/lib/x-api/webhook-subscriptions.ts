// ---------------------------------------------------------------------------
// Webhook Subscription Management — per x-api-integration.md Section 9.8
// Subscribe/unsubscribe creators to Account Activity API (AAA)
// ---------------------------------------------------------------------------

import { xApiHeaders } from "./client";
import { XApiError } from "./errors";

/**
 * Subscribe a creator to AAA webhook events after they complete X OAuth.
 * Uses the creator's own OAuth 2.0 access token.
 */
export async function subscribeCreatorToWebhook(
  webhookId: string,
  creatorAccessToken: string
): Promise<unknown> {
  const res = await fetch(
    `https://api.x.com/2/webhooks/${encodeURIComponent(webhookId)}/subscriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creatorAccessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new XApiError(res.status, await res.json());
  }

  return res.json();
}

/**
 * Unsubscribe a creator from AAA webhook events.
 * Uses app bearer token (not user token).
 */
export async function unsubscribeCreator(
  webhookId: string,
  creatorXUserId: string
): Promise<void> {
  const res = await fetch(
    `https://api.x.com/2/webhooks/${encodeURIComponent(webhookId)}/subscriptions/${encodeURIComponent(creatorXUserId)}`,
    {
      method: "DELETE",
      headers: xApiHeaders(),
    }
  );

  if (!res.ok) {
    throw new XApiError(res.status, await res.json());
  }
}
