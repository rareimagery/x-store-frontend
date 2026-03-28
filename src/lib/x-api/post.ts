// ---------------------------------------------------------------------------
// X API v2 Post lookup — per x-api-integration.md spec
// ---------------------------------------------------------------------------

import { X_API_BASE, xApiHeaders } from "./client";
import { XApiError } from "./errors";
import { fetchWithRetry } from "./fetch-with-retry";
import type { XPostResponse } from "./types";

export async function fetchPost(tweetId: string): Promise<XPostResponse> {
  const params = new URLSearchParams({
    "tweet.fields":
      "id,text,created_at,public_metrics,entities,attachments",
    "user.fields": "id,name,username,profile_image_url,verified_type",
    expansions: "author_id,attachments.media_keys",
    "media.fields": "type,url,preview_image_url,width,height",
  });

  const res = await fetchWithRetry(
    `${X_API_BASE}/tweets/${encodeURIComponent(tweetId)}?${params}`,
    { headers: xApiHeaders(), next: { revalidate: 3600 } } as RequestInit
  );

  if (!res.ok) throw new XApiError(res.status, await res.json());
  return (await res.json()) as XPostResponse;
}
