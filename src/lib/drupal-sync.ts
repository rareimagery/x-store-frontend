// ---------------------------------------------------------------------------
// Drupal X Profile Sync — triggers Drupal to sync X data
// Next.js tells Drupal WHEN to sync; Drupal does the actual X API fetching.
// ---------------------------------------------------------------------------

import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

interface SyncResult {
  success: number;
  failed: number;
  results: Array<{ username: string; status: string; error: string | null }>;
}

/**
 * Tell Drupal to sync a single X profile.
 */
export async function triggerDrupalSync(username: string): Promise<SyncResult> {
  const res = await fetch(`${DRUPAL_API_URL}/api/x-profile-sync/trigger`, {
    method: "POST",
    headers: {
      ...drupalAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`[drupal-sync] Trigger failed for @${username}: ${res.status}`);
    return { success: 0, failed: 1, results: [{ username, status: "failed", error: `HTTP ${res.status}` }] };
  }

  return res.json();
}

/**
 * Tell Drupal to run a batch sync of stale profiles.
 */
export async function triggerDrupalBatchSync(batchSize = 5): Promise<SyncResult> {
  const res = await fetch(`${DRUPAL_API_URL}/api/x-profile-sync/trigger`, {
    method: "POST",
    headers: {
      ...drupalAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ batch: true, batch_size: batchSize }),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`[drupal-sync] Batch trigger failed: ${res.status}`);
    return { success: 0, failed: 0, results: [] };
  }

  return res.json();
}
