// ---------------------------------------------------------------------------
// Profile Sync Handler — per x-api-integration.md Section 9.4
// Re-sync Drupal creator profile fields when X profile is updated
// ---------------------------------------------------------------------------

import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { upgradeProfileImageUrl } from "@/lib/x-api/utils";
import type { XUser } from "@/lib/x-api/types";

export async function syncCreatorProfile(
  xUserId: string,
  updatedFields: Partial<XUser>
) {
  // Find the creator profile node by X user ID
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?filter[field_x_user_id]=${encodeURIComponent(xUserId)}&fields[node--x_user_profile]=id`,
    { headers: { ...drupalAuthHeaders() } }
  );

  if (!res.ok) {
    console.error("[webhook:sync] Drupal lookup failed:", res.status);
    return;
  }

  const json = await res.json();
  const node = json.data?.[0];
  if (!node) return;

  const nodeId = node.id;

  // Map X API fields to Drupal fields
  const attributes: Record<string, unknown> = {};

  if (updatedFields.description !== undefined) {
    attributes.field_bio_description = {
      value: updatedFields.description,
      format: "basic_html",
    };
  }

  if (updatedFields.name !== undefined) {
    attributes.field_x_display_name = updatedFields.name;
  }

  if (updatedFields.profile_image_url !== undefined) {
    // Store the URL — actual image upload happens in the periodic sync
    attributes.field_x_avatar_url = upgradeProfileImageUrl(updatedFields.profile_image_url);
  }

  if (updatedFields.public_metrics?.followers_count !== undefined) {
    attributes.field_follower_count = updatedFields.public_metrics.followers_count;
  }

  if (updatedFields.verified_type !== undefined) {
    attributes.field_x_verified_type = updatedFields.verified_type;
  }

  // Nothing to update
  if (Object.keys(attributes).length === 0) return;

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
          attributes,
        },
      }),
    }
  );

  if (!patchRes.ok) {
    console.error("[webhook:sync] Drupal PATCH failed:", patchRes.status);
  }
}
