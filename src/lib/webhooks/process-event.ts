// ---------------------------------------------------------------------------
// Webhook Event Router — per x-api-integration.md Section 9.4
// ---------------------------------------------------------------------------

import { updateStorefrontFeed } from "./handlers/update-feed";
import { queueShoutoutCandidate } from "./handlers/shoutout";
import { syncCreatorProfile } from "./handlers/sync-profile";
import type { XWebhookEvent } from "@/lib/x-api/types";

export async function processWebhookEvent(event: XWebhookEvent) {
  const userId = event.for_user_id;

  // New post from the creator (ignore retweets on storefront feed)
  if (event.tweet_create_events?.length) {
    for (const post of event.tweet_create_events) {
      if (!post.retweeted_status) {
        await updateStorefrontFeed(userId, post);
      }
    }
  }

  // Creator received a mention — Shoutout Wall candidate
  if (event.tweet_create_events?.some((p) => p.in_reply_to_user_id_str === userId)) {
    const mentions = event.tweet_create_events!.filter(
      (p) => p.in_reply_to_user_id_str === userId
    );
    for (const mention of mentions) {
      await queueShoutoutCandidate(userId, mention);
    }
  }

  // Profile updated (display name, bio, avatar, etc.)
  if (event.user_event?.user_fields_update) {
    await syncCreatorProfile(userId, event.user_event.user_fields_update);
  }
}
