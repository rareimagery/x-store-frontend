// ---------------------------------------------------------------------------
// Social Layer — Follow system helpers
// ---------------------------------------------------------------------------

import { drupalWriteHeaders, DRUPAL_API_URL } from "@/lib/drupal";

interface JsonApiEntity {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { id?: string } | null }>;
}

interface FollowFlagging {
  id?: string;
  attributes?: {
    field_follower_store_id?: string;
  };
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FollowStatus {
  isFollowing: boolean;
  flaggingId: string | null;
}

export interface FollowerInfo {
  storeId: string;
  storeName: string;
  storeSlug: string;
  xUsername: string;
  profilePictureUrl: string | null;
  followerCount: number;
  isMutual: boolean;
}

export interface SocialProfile {
  storeId: string;
  storeName: string;
  storeSlug: string;
  xUsername: string;
  socialBio: string;
  followerCount: number;
  followingCount: number;
  productCount: number;
  profilePictureUrl: string | null;
  bannerUrl: string | null;
  shoutoutEnabled: boolean;
  collabOpen: boolean;
  xSeedImported: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Look up a store UUID by X username (via the linked profile) */
export async function getStoreByXUsername(
  xUsername: string
): Promise<{ storeId: string; storeInternalId: string; storeName: string } | null> {
  const params = new URLSearchParams({
    "filter[field_x_username]": xUsername,
    include: "field_linked_store",
  });

  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?${params}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;
  const json = await res.json();
  const node = json.data?.[0];
  if (!node) return null;

  const storeRef = node.relationships?.field_linked_store?.data;
  if (!storeRef) return null;

  const storeEntity = ((json.included ?? []) as JsonApiEntity[]).find(
    (inc) => inc.id === storeRef.id
  );

  const storeInternalIdRaw = storeEntity?.attributes?.["drupal_internal__store_id"];
  const storeNameRaw = storeEntity?.attributes?.["name"];

  return {
    storeId: storeRef.id,
    storeInternalId:
      typeof storeInternalIdRaw === "string" || typeof storeInternalIdRaw === "number"
        ? String(storeInternalIdRaw)
        : "",
    storeName: typeof storeNameRaw === "string" ? storeNameRaw : xUsername,
  };
}

/** Check if a user (by their store UUID) is following a target store */
export async function checkFollowStatus(
  followerStoreId: string,
  targetStoreId: string
): Promise<FollowStatus> {
  // Query flaggings for this specific user→store relationship
  // Flag module stores flaggings with uid (the user who flagged) and entity_id (the flagged entity)
  // Since we're using server-side admin auth, we query by filtering
  const params = new URLSearchParams({
    "filter[flag_id]": "follow_creator",
    "filter[entity_id]": targetStoreId,
  });

  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/flagging/follow_creator?${params}`,
    { cache: "no-store" }
  );

  if (!res.ok) return { isFollowing: false, flaggingId: null };
  const json = await res.json();

  // Look for a flagging from the follower's perspective
  // Since we use admin auth, we need to store follower info in the flagging
  const flagging = ((json.data ?? []) as FollowFlagging[]).find(
    (f) => f.attributes?.field_follower_store_id === followerStoreId
  );

  if (flagging) {
    return { isFollowing: true, flaggingId: flagging.id ?? null };
  }

  return { isFollowing: false, flaggingId: null };
}

/** Create a follow relationship */
export async function createFollow(
  followerStoreId: string,
  targetStoreId: string,
  targetStoreInternalId: string,
  source: "rareimagery" | "x_import" = "rareimagery"
): Promise<{ flaggingId: string }> {
  const writeHeaders = await drupalWriteHeaders();

  const body = {
    data: {
      type: "flagging--follow_creator",
      attributes: {
        field_follower_store_id: followerStoreId,
        field_follow_source: source,
      },
      relationships: {
        flagged_entity: {
          data: {
            type: "commerce_store--online",
            id: targetStoreId,
          },
        },
        flag_id: {
          data: {
            type: "flag--flag",
            id: "follow_creator",
          },
        },
      },
    },
  };

  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/flagging/follow_creator`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
        ...writeHeaders,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create follow: ${res.status} — ${text.slice(0, 300)}`);
  }

  const json = await res.json();

  // Update follower counts
  await updateFollowerCount(targetStoreId, 1);
  await updateFollowingCount(followerStoreId, 1);

  return { flaggingId: json.data.id };
}

/** Remove a follow relationship */
export async function removeFollow(
  flaggingId: string,
  followerStoreId: string,
  targetStoreId: string
): Promise<void> {
  const writeHeaders = await drupalWriteHeaders();

  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/flagging/follow_creator/${flaggingId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/vnd.api+json",
        ...writeHeaders,
      },
    }
  );

  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to remove follow: ${res.status}`);
  }

  // Update follower counts
  await updateFollowerCount(targetStoreId, -1);
  await updateFollowingCount(followerStoreId, -1);
}

/** Update the denormalized follower count on a store */
async function updateFollowerCount(
  storeId: string,
  delta: number
): Promise<void> {
  try {
    // Get current count
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${storeId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return;
    const json = await res.json();
    const current = json.data?.attributes?.field_follower_count ?? 0;
    const newCount = Math.max(0, current + delta);

    const writeHeaders = await drupalWriteHeaders();
    await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${storeId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/vnd.api+json",
          Accept: "application/vnd.api+json",
          ...writeHeaders,
        },
        body: JSON.stringify({
          data: {
            type: "commerce_store--online",
            id: storeId,
            attributes: { field_follower_count: newCount },
          },
        }),
      }
    );
  } catch (err) {
    console.error("Failed to update follower count:", err);
  }
}

/** Update the denormalized following count on a store */
async function updateFollowingCount(
  storeId: string,
  delta: number
): Promise<void> {
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${storeId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return;
    const json = await res.json();
    const current = json.data?.attributes?.field_following_count ?? 0;
    const newCount = Math.max(0, current + delta);

    const writeHeaders = await drupalWriteHeaders();
    await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${storeId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/vnd.api+json",
          Accept: "application/vnd.api+json",
          ...writeHeaders,
        },
        body: JSON.stringify({
          data: {
            type: "commerce_store--online",
            id: storeId,
            attributes: { field_following_count: newCount },
          },
        }),
      }
    );
  } catch (err) {
    console.error("Failed to update following count:", err);
  }
}

/** Get all followers of a store */
export async function getFollowers(
  targetStoreId: string
): Promise<FollowerInfo[]> {
  const params = new URLSearchParams({
    "filter[flagged_entity.id]": targetStoreId,
  });

  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/flagging/follow_creator?${params}`,
    { cache: "no-store" }
  );

  if (!res.ok) return [];
  const json = await res.json();
  const flaggings = json.data ?? [];

  const followers: FollowerInfo[] = [];

  for (const flagging of flaggings) {
    const followerStoreId = flagging.attributes?.field_follower_store_id;
    if (!followerStoreId) continue;

    // Fetch the follower's store info
    const storeRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${followerStoreId}?include=field_linked_x_profile`,
      { cache: "no-store" }
    );

    if (!storeRes.ok) continue;
    const storeJson = await storeRes.json();
    const store = storeJson.data as JsonApiEntity | null;
    if (!store) continue;

    const profileRef = store.relationships?.field_linked_x_profile?.data;
    const profile = profileRef
      ? ((storeJson.included ?? []) as JsonApiEntity[]).find((inc) => inc.id === profileRef.id)
      : null;

    // Check if mutual follow
    const reverseParams = new URLSearchParams({
      "filter[flagged_entity.id]": followerStoreId,
      "filter[field_follower_store_id]": targetStoreId,
    });
    const reverseRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/flagging/follow_creator?${reverseParams}`,
      { cache: "no-store" }
    );
    const reverseJson = reverseRes.ok ? await reverseRes.json() : { data: [] };
    const isMutual = (reverseJson.data ?? []).length > 0;

    const storeAttrs = store.attributes ?? {};
    const profileAttrs = profile?.attributes ?? {};

    followers.push({
      storeId: followerStoreId,
      storeName: asString(storeAttrs["name"]),
      storeSlug: asString(storeAttrs["field_store_slug"]),
      xUsername: asString(profileAttrs["field_x_username"]),
      profilePictureUrl: null, // Would need file include chain
      followerCount: asNumber(storeAttrs["field_follower_count"]),
      isMutual,
    });
  }

  return followers;
}

/** Get all stores a user follows */
export async function getFollowing(
  followerStoreId: string
): Promise<FollowerInfo[]> {
  const params = new URLSearchParams({
    "filter[field_follower_store_id]": followerStoreId,
  });

  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/flagging/follow_creator?${params}`,
    { cache: "no-store" }
  );

  if (!res.ok) return [];
  const json = await res.json();
  const flaggings = json.data ?? [];

  const following: FollowerInfo[] = [];

  for (const flagging of flaggings) {
    const targetRef = flagging.relationships?.flagged_entity?.data;
    if (!targetRef) continue;

    const storeRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${targetRef.id}?include=field_linked_x_profile`,
      { cache: "no-store" }
    );

    if (!storeRes.ok) continue;
    const storeJson = await storeRes.json();
    const store = storeJson.data as JsonApiEntity | null;
    if (!store) continue;

    const profileRef = store.relationships?.field_linked_x_profile?.data;
    const profile = profileRef
      ? ((storeJson.included ?? []) as JsonApiEntity[]).find((inc) => inc.id === profileRef.id)
      : null;

    // Check mutual
    const reverseParams = new URLSearchParams({
      "filter[flagged_entity.id]": followerStoreId,
      "filter[field_follower_store_id]": targetRef.id,
    });
    const reverseRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/flagging/follow_creator?${reverseParams}`,
      { cache: "no-store" }
    );
    const reverseJson = reverseRes.ok ? await reverseRes.json() : { data: [] };
    const isMutual = (reverseJson.data ?? []).length > 0;

    const storeAttrs = store.attributes ?? {};
    const profileAttrs = profile?.attributes ?? {};

    following.push({
      storeId: targetRef.id,
      storeName: asString(storeAttrs["name"]),
      storeSlug: asString(storeAttrs["field_store_slug"]),
      xUsername: asString(profileAttrs["field_x_username"]),
      profilePictureUrl: null,
      followerCount: asNumber(storeAttrs["field_follower_count"]),
      isMutual,
    });
  }

  return following;
}

/** Cross-reference X following list with existing RareImagery stores */
export async function seedFromX(
  xFollowingHandles: string[]
): Promise<{ matched: FollowerInfo[]; total: number }> {
  if (!xFollowingHandles.length) return { matched: [], total: 0 };

  // Fetch all stores that have an X profile with matching handles
  const matched: FollowerInfo[] = [];

  for (const handle of xFollowingHandles) {
    const params = new URLSearchParams({
      "filter[field_x_username]": handle,
      include: "field_linked_store,field_profile_picture",
    });

    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?${params}`,
      { cache: "no-store" }
    );

    if (!res.ok) continue;
    const json = await res.json();
    const node = json.data?.[0];
    if (!node) continue;

    const storeRef = node.relationships?.field_linked_store?.data;
    if (!storeRef) continue;

    const storeEntity = ((json.included ?? []) as JsonApiEntity[]).find(
      (inc) => inc.id === storeRef.id
    );
    if (!storeEntity) continue;

    // Get profile picture
    let pfpUrl: string | null = null;
    const pfpRef = node.relationships?.field_profile_picture?.data;
    if (pfpRef) {
      const fileEntity = ((json.included ?? []) as JsonApiEntity[]).find(
        (inc) => inc.id === pfpRef.id && inc.type === "file--file"
      );
      const uri = fileEntity?.attributes?.["uri"] as { url?: string } | undefined;
      if (uri?.url) {
        const path = uri.url;
        pfpUrl = path.startsWith("http") ? path : `${DRUPAL_API_URL}${path}`;
      }
    }

    const storeAttrs = storeEntity.attributes ?? {};

    matched.push({
      storeId: storeRef.id,
      storeName: asString(storeAttrs["name"], handle),
      storeSlug: asString(storeAttrs["field_store_slug"], handle),
      xUsername: handle,
      profilePictureUrl: pfpUrl,
      followerCount: asNumber(storeAttrs["field_follower_count"]),
      isMutual: false,
    });
  }

  return { matched, total: xFollowingHandles.length };
}
