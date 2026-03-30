// ---------------------------------------------------------------------------
// Feed Update Handler — per x-api-integration.md Section 9.5
// Prepend new posts to Drupal cached feed instead of re-fetching the timeline
// ---------------------------------------------------------------------------

import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import type { XPost, XWebhookPost } from "@/lib/x-api/types";

export async function updateStorefrontFeed(
  xUserId: string,
  newPost: XWebhookPost
) {
  // Find the store/profile node by X user ID
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?filter[field_x_user_id]=${encodeURIComponent(xUserId)}&fields[node--x_user_profile]=id,field_top_posts`,
    { headers: { ...drupalAuthHeaders() } }
  );

  if (!res.ok) {
    console.error("[webhook:feed] Drupal lookup failed:", res.status);
    return;
  }

  const json = await res.json();
  const node = json.data?.[0];
  if (!node) return; // creator not in RareImagery

  const nodeId = node.id;

  // Parse existing cached posts
  const existingRaw: string[] = node.attributes?.field_top_posts ?? [];
  const existing: XPost[] = existingRaw
    .map((s: string) => {
      try { return JSON.parse(s); } catch { return null; }
    })
    .filter(Boolean);

  // Normalize webhook post shape to match XPost type
  const text = newPost.extended_tweet?.full_text ?? newPost.text;
  const normalized: XPost = {
    id: newPost.id_str,
    text,
    created_at: newPost.created_at,
    public_metrics: {
      like_count: 0,
      retweet_count: 0,
      reply_count: 0,
      quote_count: 0,
      impression_count: 0,
      bookmark_count: 0,
    },
  };

  // Deduplicate — don't add if we already have this post
  if (existing.some((p) => p.id === normalized.id)) return;

  // Prepend, keep last 20
  const updated = [normalized, ...existing].slice(0, 20);

  const writeHeaders = await drupalWriteHeaders();
  const patchRes = await fetch(
    `${DRUPAL_API_URL}/jsonapi/node/x_user_profile/${nodeId}`,
    {
      method: "PATCH",
      headers: {
        ...writeHeaders,
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "node--x_user_profile",
          id: nodeId,
          attributes: {
            field_top_posts: updated.map((p) => JSON.stringify(p)),
          },
        },
      }),
    }
  );

  if (!patchRes.ok) {
    console.error("[webhook:feed] Drupal PATCH failed:", patchRes.status);
  }
}
