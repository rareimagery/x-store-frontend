// ---------------------------------------------------------------------------
// Shoutout Wall Candidate Handler — per x-api-integration.md Section 9.6
// Queue incoming mentions as candidates for creator approval
// ---------------------------------------------------------------------------

import { DRUPAL_API_URL, drupalWriteHeaders } from "@/lib/drupal";
import type { XWebhookPost } from "@/lib/x-api/types";

export async function queueShoutoutCandidate(
  creatorXUserId: string,
  mention: XWebhookPost
) {
  // Only surface top-level mentions (not threaded replies)
  if (mention.in_reply_to_status_id_str) return;

  // Shoutout Wall cap is 120 chars — strip leading @mention
  const text = mention.text.replace(/^@\w+\s*/, "").trim();
  if (text.length > 120) return;

  const writeHeaders = await drupalWriteHeaders();
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/node/shoutout`,
    {
      method: "POST",
      headers: {
        ...writeHeaders,
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "node--shoutout",
          attributes: {
            title: `Shoutout from @${mention.user.screen_name}`,
            field_shoutout_text: text,
            field_from_x_username: mention.user.screen_name,
            field_from_x_user_id: mention.user.id_str,
            field_for_creator_x_id: creatorXUserId,
            field_source_post_id: mention.id_str,
            field_shoutout_status: "pending",
            field_created_at: mention.created_at,
          },
        },
      }),
    }
  );

  if (!res.ok) {
    console.error(
      "[webhook:shoutout] Drupal POST failed:",
      res.status,
      await res.text()
    );
  }
}
