// ---------------------------------------------------------------------------
// X API v2 User endpoints — per x-api-integration.md spec
// ---------------------------------------------------------------------------

import { X_API_BASE, xApiHeaders } from "./client";
import { XApiError } from "./errors";
import { fetchWithRetry } from "./fetch-with-retry";
import type { XUser, XUserResponse, XUsersResponse } from "./types";

const USER_FIELDS = [
  "id",
  "name",
  "username",
  "description",
  "profile_image_url",
  "public_metrics",
  "verified_type",
  "url",
  "entities",
  "location",
  "created_at",
  "pinned_tweet_id",
].join(",");

export async function fetchXProfile(username: string): Promise<XUserResponse> {
  const params = new URLSearchParams({
    "user.fields": USER_FIELDS,
    expansions: "pinned_tweet_id",
    "tweet.fields": "text,created_at,public_metrics",
  });

  const res = await fetchWithRetry(
    `${X_API_BASE}/users/by/username/${encodeURIComponent(username)}?${params}`,
    { headers: xApiHeaders(), next: { revalidate: 3600 } } as RequestInit
  );

  if (!res.ok) throw new XApiError(res.status, await res.json());
  return (await res.json()) as XUserResponse;
}

export async function fetchUserById(userId: string): Promise<XUserResponse> {
  const params = new URLSearchParams({
    "user.fields": USER_FIELDS,
  });

  const res = await fetchWithRetry(
    `${X_API_BASE}/users/${encodeURIComponent(userId)}?${params}`,
    { headers: xApiHeaders() }
  );

  if (!res.ok) throw new XApiError(res.status, await res.json());
  return (await res.json()) as XUserResponse;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function fetchUsersBatch(usernames: string[]): Promise<XUser[]> {
  const chunks = chunkArray(usernames, 100);
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const params = new URLSearchParams({
        usernames: chunk.join(","),
        "user.fields": USER_FIELDS,
      });
      const res = await fetchWithRetry(
        `${X_API_BASE}/users/by?${params}`,
        { headers: xApiHeaders() }
      );
      if (!res.ok) throw new XApiError(res.status, await res.json());
      return ((await res.json()) as XUsersResponse).data;
    })
  );
  return results.flat();
}

export async function fetchFollowers(
  userId: string,
  options: { maxResults?: number; paginationToken?: string } = {}
): Promise<{ data: XUser[]; meta?: { next_token?: string } }> {
  const params = new URLSearchParams({
    max_results: String(options.maxResults ?? 20),
    "user.fields": "id,name,username,public_metrics,profile_image_url,verified_type",
  });
  if (options.paginationToken) {
    params.set("pagination_token", options.paginationToken);
  }

  const res = await fetchWithRetry(
    `${X_API_BASE}/users/${encodeURIComponent(userId)}/followers?${params}`,
    { headers: xApiHeaders() }
  );

  if (!res.ok) throw new XApiError(res.status, await res.json());
  return await res.json();
}

export async function fetchFollowing(
  userId: string,
  options: {
    maxResults?: number;
    paginationToken?: string;
    accessToken?: string;
  } = {}
): Promise<{ data: XUser[]; meta?: { next_token?: string } }> {
  const params = new URLSearchParams({
    max_results: String(options.maxResults ?? 1000),
    "user.fields": "username",
  });
  if (options.paginationToken) {
    params.set("pagination_token", options.paginationToken);
  }

  const headers = options.accessToken
    ? { Authorization: `Bearer ${options.accessToken}`, "Content-Type": "application/json" }
    : xApiHeaders();

  const res = await fetchWithRetry(
    `${X_API_BASE}/users/${encodeURIComponent(userId)}/following?${params}`,
    { headers }
  );

  if (!res.ok) throw new XApiError(res.status, await res.json());
  return await res.json();
}
