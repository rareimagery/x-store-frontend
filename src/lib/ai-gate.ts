import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;
const PLATFORM_CREATOR = "rareimagery";

/** Free lifetime Grok Imagine generations before requiring @rareimagery subscription */
export const FREE_LIFETIME_LIMIT = 20;

export interface AiGateStatus {
  totalGenerations: number;
  storeUuid: string | null;
  limitReached: boolean;
  platformSubscribed: boolean;
  canGenerate: boolean;
}

/**
 * Check if a creator has hit the lifetime AI generation limit
 * and whether they've subscribed to @rareimagery on X.
 */
export async function checkAiGate(storeSlug: string, visitorUsername: string): Promise<AiGateStatus> {
  if (!DRUPAL_API) {
    return { totalGenerations: 0, storeUuid: null, limitReached: false, platformSubscribed: false, canGenerate: true };
  }

  try {
    // Fetch store with lifetime count
    const res = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(storeSlug)}&fields[commerce_store--online]=field_total_grok_generations`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );

    if (!res.ok) {
      return { totalGenerations: 0, storeUuid: null, limitReached: false, platformSubscribed: false, canGenerate: true };
    }

    const json = await res.json();
    const store = json.data?.[0];
    if (!store) {
      return { totalGenerations: 0, storeUuid: null, limitReached: false, platformSubscribed: false, canGenerate: true };
    }

    const totalGenerations = store.attributes?.field_total_grok_generations || 0;
    const limitReached = totalGenerations >= FREE_LIFETIME_LIMIT;

    // Admin bypass
    const adminUsernames = (process.env.ADMIN_X_USERNAMES || "rareimagery").split(",").map((u) => u.trim().toLowerCase());
    if (adminUsernames.includes(visitorUsername.toLowerCase())) {
      return { totalGenerations, storeUuid: store.id, limitReached: false, platformSubscribed: true, canGenerate: true };
    }

    // If not at limit, no need to check subscription
    if (!limitReached) {
      return { totalGenerations, storeUuid: store.id, limitReached: false, platformSubscribed: false, canGenerate: true };
    }

    // Check if creator has claimed platform subscription (grace table: visitor=creator, creator=rareimagery)
    let platformSubscribed = false;
    try {
      const graceRes = await fetch(
        `${DRUPAL_API}/api/grace-status/${encodeURIComponent(PLATFORM_CREATOR)}/${encodeURIComponent(visitorUsername)}`,
        { headers: drupalAuthHeaders(), cache: "no-store" }
      );
      if (graceRes.ok) {
        const graceData = await graceRes.json();
        platformSubscribed = graceData.status === "claimed";
      }
    } catch {
      // Fail open — don't block
    }

    return {
      totalGenerations,
      storeUuid: store.id,
      limitReached: true,
      platformSubscribed,
      canGenerate: platformSubscribed, // Can only generate if subscribed after limit
    };
  } catch {
    return { totalGenerations: 0, storeUuid: null, limitReached: false, platformSubscribed: false, canGenerate: true };
  }
}

/**
 * Increment the lifetime total generation count.
 */
export async function incrementLifetimeCount(storeUuid: string, currentTotal: number): Promise<number> {
  if (!DRUPAL_API || !storeUuid) return currentTotal + 1;
  const newTotal = currentTotal + 1;
  try {
    const writeHeaders = await drupalWriteHeaders();
    await fetch(`${DRUPAL_API}/jsonapi/commerce_store/online/${storeUuid}`, {
      method: "PATCH",
      headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: {
          type: "commerce_store--online",
          id: storeUuid,
          attributes: { field_total_grok_generations: newTotal },
        },
      }),
    });
  } catch (err) {
    console.error("[ai-gate] Failed to update lifetime count:", err);
  }
  return newTotal;
}
