// ---------------------------------------------------------------------------
// X API v2 Timeline endpoint — per x-api-integration.md spec
// ---------------------------------------------------------------------------

import { X_API_BASE, xApiHeaders } from "./client";
import { XApiError } from "./errors";
import { fetchWithRetry } from "./fetch-with-retry";
import type { XTimelineResponse } from "./types";

export async function fetchUserTimeline(
  userId: string,
  options: {
    maxResults?: number;
    paginationToken?: string;
    exclude?: string[];
  } = {}
): Promise<XTimelineResponse> {
  const params = new URLSearchParams({
    max_results: String(options.maxResults ?? 10),
    "tweet.fields": [
      "id",
      "text",
      "created_at",
      "public_metrics",
      "attachments",
      "entities",
      "referenced_tweets",
    ].join(","),
    expansions: ["attachments.media_keys", "referenced_tweets.id"].join(","),
    "media.fields": [
      "media_key",
      "type",
      "url",
      "preview_image_url",
      "width",
      "height",
      "alt_text",
    ].join(","),
  });

  if (options.exclude && options.exclude.length > 0) {
    params.set("exclude", options.exclude.join(","));
  }

  if (options.paginationToken) {
    params.set("pagination_token", options.paginationToken);
  }

  const res = await fetchWithRetry(
    `${X_API_BASE}/users/${encodeURIComponent(userId)}/tweets?${params}`,
    { headers: xApiHeaders(), next: { revalidate: 900 } } as RequestInit
  );

  if (!res.ok) throw new XApiError(res.status, await res.json());
  return (await res.json()) as XTimelineResponse;
}
