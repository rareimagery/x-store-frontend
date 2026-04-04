// ---------------------------------------------------------------------------
// X (Twitter) API v2 Data Import — raw fetch per x-api-integration.md
// ---------------------------------------------------------------------------

import { drupalAbsoluteUrl, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { xApiHeaders, xUserHeaders, X_API_BASE } from "@/lib/x-api/client";
import { fetchWithRetry } from "@/lib/x-api/fetch-with-retry";
import { XApiError } from "@/lib/x-api/errors";
import { isSafeImageUrl } from "@/lib/ownership";
import { upgradeProfileImageUrl } from "@/lib/x-api/utils";
import type { XUser, XPost, XMedia } from "@/lib/x-api/types";

const DRUPAL_API = process.env.DRUPAL_API_URL;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface XImportData {
  username: string;
  displayName: string;
  bio: string;
  followerCount: number;
  profileImageUrl: string | null;
  bannerUrl: string | null;
  verified: boolean;
  verifiedType: string;
  topPosts: Array<{
    id: string;
    text: string;
    image_url?: string;
    likes: number;
    retweets: number;
    replies: number;
    views: number;
    date: string;
  }>;
  topFollowers: Array<{
    username: string;
    display_name: string;
    profile_image_url?: string;
    follower_count: number;
    verified: boolean;
  }>;
  metrics: {
    engagement_score: number;
    avg_likes: number;
    avg_retweets: number;
    avg_views: number;
    top_themes: string[];
    recommended_products: string[];
    posting_frequency: string;
    audience_sentiment: string;
  };
}

export type XImportSnapshotStatus = "pending" | "success" | "failed";

export interface XImportSnapshotInput {
  xUsername: string;
  xUserId?: string;
  runId: string;
  status: XImportSnapshotStatus;
  payload?: unknown;
  errorMessage?: string;
  profileUuid?: string;
  storeUuid?: string;
}

export interface ProfileMediaFieldState {
  profilePictureFileId: string | null;
  backgroundBannerFileId: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractThemes(tweets: Array<{ text: string }>, limit = 5): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
    "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "both",
    "each", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "so", "than", "too", "very", "just",
    "because", "but", "and", "or", "if", "while", "this", "that", "these",
    "those", "it", "its", "i", "me", "my", "we", "our", "you", "your",
    "he", "him", "his", "she", "her", "they", "them", "their", "what",
    "which", "who", "whom", "rt", "amp", "https", "http", "co",
  ]);

  const freq: Record<string, number> = {};

  for (const tweet of tweets) {
    const hashtags = tweet.text.match(/#[\w]+/g) ?? [];
    for (const tag of hashtags) {
      const clean = tag.toLowerCase();
      freq[clean] = (freq[clean] ?? 0) + 1;
    }

    const words = tweet.text
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[^a-zA-Z\s]/g, "")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stopWords.has(w));

    for (const word of words) {
      freq[word] = (freq[word] ?? 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function estimatePostingFrequency(dates: string[]): string {
  if (dates.length < 2) return "Unknown";

  const sorted = dates
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b);

  const spanMs = sorted[sorted.length - 1] - sorted[0];
  const spanDays = spanMs / (1000 * 60 * 60 * 24);

  if (spanDays === 0) return "Several times a day";

  const tweetsPerDay = dates.length / Math.max(spanDays, 1);

  if (tweetsPerDay >= 3) return "Several times a day";
  if (tweetsPerDay >= 0.8) return "Daily";
  if (tweetsPerDay >= 0.3) return "Several times a week";
  if (tweetsPerDay >= 0.1) return "Weekly";
  return "Occasionally";
}

function normalizeBannerUrl(url?: string): string | null {
  if (!url) return null;
  // X returns banner base path; append a stable size variant for storefront use.
  return /\/\d+x\d+$/.test(url) ? url : `${url}/1500x500`;
}

// ---------------------------------------------------------------------------
// Main fetch function — raw X API v2 fetch per spec
// ---------------------------------------------------------------------------

/**
 * Fetch X profile data, tweets, and followers using raw X API v2 calls.
 * Uses api.x.com/2/ base URL per spec. verified_type replaces deprecated verified.
 */
export async function fetchXData(
  accessToken: string | undefined,
  userId: string
): Promise<XImportData> {
  const headers = accessToken ? xUserHeaders(accessToken) : xApiHeaders();

  // 1. Fetch user profile with all storefront-relevant fields
  const profileParams = new URLSearchParams({
    "user.fields": [
      "id", "name", "username", "description", "profile_image_url",
      "profile_banner_url", "public_metrics", "verified_type", "url", "entities", "location", "created_at",
    ].join(","),
  });

  const profileRes = await fetchWithRetry(
    `${X_API_BASE}/users/${encodeURIComponent(userId)}?${profileParams}`,
    { headers }
  );

  if (!profileRes.ok) throw new XApiError(profileRes.status, await profileRes.json());
  const profileJson = await profileRes.json();
  const user: XUser = profileJson.data;

  if (!user) {
    throw new Error(`Failed to fetch X profile for user ${userId}`);
  }

  const publicMetrics = user.public_metrics ?? {} as NonNullable<XUser["public_metrics"]>;
  const username: string = user.username ?? "";
  const displayName: string = user.name ?? username;
  const bio: string = user.description ?? "";
  const followerCount: number = publicMetrics.followers_count ?? 0;
  const verifiedType: string = user.verified_type ?? "none";
  const verified: boolean = verifiedType !== "none";
  const profileImageUrl: string | null = user.profile_image_url
    ? upgradeProfileImageUrl(user.profile_image_url)
    : null;
  const bannerUrl: string | null = normalizeBannerUrl(user.profile_banner_url);

  // 2. Fetch recent tweets with media expansions (exclude replies/retweets for cleaner feed)
  let rawTweets: XPost[] = [];
  const mediaMap = new Map<string, XMedia>();

  try {
    const tweetsParams = new URLSearchParams({
      max_results: "10",
      "tweet.fields": "id,text,public_metrics,created_at,attachments",
      expansions: "attachments.media_keys",
      "media.fields": "media_key,type,url,preview_image_url,width,height",
      exclude: "replies,retweets",
    });

    const tweetsRes = await fetchWithRetry(
      `${X_API_BASE}/users/${encodeURIComponent(userId)}/tweets?${tweetsParams}`,
      { headers }
    );

    if (tweetsRes.ok) {
      const tweetsJson = await tweetsRes.json();
      rawTweets = tweetsJson.data ?? [];
      const mediaIncludes: XMedia[] = tweetsJson.includes?.media ?? [];

      for (const m of mediaIncludes) {
        if (m.media_key) {
          mediaMap.set(m.media_key, m);
        }
      }
    }
  } catch (err) {
    console.error("[x-import] Failed to fetch tweets:", err);
  }

  const topPosts = rawTweets.map((t) => {
    const pm = t.public_metrics ?? {} as NonNullable<XPost["public_metrics"]>;
    const mediaKeys: string[] = t.attachments?.media_keys ?? [];
    const imageUrl = mediaKeys
      .map((k) => mediaMap.get(k))
      .filter(Boolean)
      .map((m) => m!.url ?? m!.preview_image_url)
      .find((u) => !!u);

    const post: XImportData["topPosts"][number] = {
      id: t.id,
      text: t.text ?? "",
      likes: pm.like_count ?? 0,
      retweets: pm.retweet_count ?? 0,
      replies: pm.reply_count ?? 0,
      views: pm.impression_count ?? 0,
      date: t.created_at ?? "",
    };
    if (imageUrl) post.image_url = imageUrl;
    return post;
  })
    .sort((a, b) => {
      const ta = a.date ? Date.parse(a.date) : 0;
      const tb = b.date ? Date.parse(b.date) : 0;
      return tb - ta;
    })
    .slice(0, 8);

  // 3. Fetch top followers (get 20, sort by follower_count, take top 8)
  let rawFollowers: XUser[] = [];
  try {
    const followersParams = new URLSearchParams({
      max_results: "20",
      "user.fields": "id,name,username,public_metrics,profile_image_url,verified_type",
    });

    const followersRes = await fetchWithRetry(
      `${X_API_BASE}/users/${encodeURIComponent(userId)}/followers?${followersParams}`,
      { headers }
    );

    if (followersRes.ok) {
      const followersJson = await followersRes.json();
      rawFollowers = followersJson.data ?? [];
    }
  } catch (err) {
    console.error("[x-import] Failed to fetch followers:", err);
  }

  const topFollowers = rawFollowers
    .map((f) => ({
      username: f.username ?? "",
      display_name: f.name ?? f.username ?? "",
      profile_image_url: f.profile_image_url
        ? upgradeProfileImageUrl(f.profile_image_url)
        : undefined,
      follower_count: f.public_metrics?.followers_count ?? 0,
      verified: (f.verified_type ?? "none") !== "none",
    }))
    .sort((a, b) => b.follower_count - a.follower_count)
    .slice(0, 8);

  // 4. Calculate metrics
  const totalLikes = topPosts.reduce((s, p) => s + p.likes, 0);
  const totalRetweets = topPosts.reduce((s, p) => s + p.retweets, 0);
  const totalViews = topPosts.reduce((s, p) => s + p.views, 0);
  const count = topPosts.length || 1;

  const avgLikes = Math.round(totalLikes / count);
  const avgRetweets = Math.round(totalRetweets / count);
  const avgViews = Math.round(totalViews / count);

  const avgEngagements = (totalLikes + totalRetweets) / count;
  const engagementScore =
    followerCount > 0
      ? Math.min(100, Math.round((avgEngagements / followerCount) * 10000))
      : 0;

  const tweetDates = topPosts.map((p) => p.date).filter(Boolean);
  const postingFrequency = estimatePostingFrequency(tweetDates);
  const topThemes = extractThemes(topPosts);

  const metrics: XImportData["metrics"] = {
    engagement_score: engagementScore,
    avg_likes: avgLikes,
    avg_retweets: avgRetweets,
    avg_views: avgViews,
    top_themes: topThemes,
    recommended_products: [],
    posting_frequency: postingFrequency,
    audience_sentiment: "Positive",
  };

  return {
    username,
    displayName,
    bio,
    followerCount,
    profileImageUrl,
    bannerUrl,
    verified,
    verifiedType,
    topPosts,
    topFollowers,
    metrics,
  };
}

// ---------------------------------------------------------------------------
// Drupal sync helpers
// ---------------------------------------------------------------------------

export async function findProfileByUsername(
  username: string
): Promise<{ uuid: string; nid: number } | null> {
  const cleaned = username.trim().replace(/^@+/, "");
  const candidates = Array.from(new Set([cleaned, cleaned.toLowerCase()].filter(Boolean)));

  for (const candidate of candidates) {
    const res: Response = await fetch(
      `${DRUPAL_API}/jsonapi/node/x_user_profile?filter[field_x_username]=${encodeURIComponent(candidate)}`,
      { headers: { ...drupalAuthHeaders() } }
    );

    if (!res.ok) {
      console.error("Drupal lookup failed:", res.status, await res.text());
      continue;
    }

    const json = await res.json();
    const nodes = json.data ?? [];
    if (nodes.length > 0) {
      return {
        uuid: nodes[0].id,
        nid: nodes[0].attributes.drupal_internal__nid,
      };
    }
  }

  return null;
}

export async function patchProfile(
  uuid: string,
  attributes: Record<string, unknown>
): Promise<void> {
  const writeHeaders = await drupalWriteHeaders();
  const res = await fetch(
    `${DRUPAL_API}/jsonapi/node/x_user_profile/${uuid}`,
    {
      method: "PATCH",
      headers: {
        ...writeHeaders,
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "node--x_user_profile",
          id: uuid,
          attributes,
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drupal PATCH failed (${res.status}): ${text}`);
  }
}

export async function createImportSnapshot(input: XImportSnapshotInput): Promise<string | null> {
  try {
    const writeHeaders = await drupalWriteHeaders();
    const payload =
      input.payload !== undefined
        ? JSON.stringify(input.payload)
        : null;

    const res = await fetch(`${DRUPAL_API}/jsonapi/node/x_import_profile_snapshot`, {
      method: "POST",
      headers: {
        ...writeHeaders,
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "node--x_import_profile_snapshot",
          attributes: {
            title: `X Import @${input.xUsername} (${input.runId.slice(0, 8)})`,
            field_x_import_status: input.status,
            field_x_import_username: input.xUsername,
            field_x_import_user_id: input.xUserId || "",
            field_x_import_run_id: input.runId,
            field_x_import_payload: payload || "",
            field_x_import_error: input.errorMessage || "",
            field_x_import_profile_uuid: input.profileUuid || "",
            field_x_import_store_uuid: input.storeUuid || "",
          },
        },
      }),
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    return json?.data?.id || null;
  } catch {
    return null;
  }
}

export async function updateImportSnapshot(
  snapshotUuid: string,
  input: Partial<XImportSnapshotInput>
): Promise<void> {
  try {
    const writeHeaders = await drupalWriteHeaders();
    const attributes: Record<string, unknown> = {};

    if (input.status) attributes.field_x_import_status = input.status;
    if (input.xUsername !== undefined) attributes.field_x_import_username = input.xUsername;
    if (input.xUserId !== undefined) attributes.field_x_import_user_id = input.xUserId;
    if (input.runId !== undefined) attributes.field_x_import_run_id = input.runId;
    if (input.payload !== undefined) attributes.field_x_import_payload = JSON.stringify(input.payload);
    if (input.errorMessage !== undefined) attributes.field_x_import_error = input.errorMessage;
    if (input.profileUuid !== undefined) attributes.field_x_import_profile_uuid = input.profileUuid;
    if (input.storeUuid !== undefined) attributes.field_x_import_store_uuid = input.storeUuid;

    await fetch(`${DRUPAL_API}/jsonapi/node/x_import_profile_snapshot/${snapshotUuid}`, {
      method: "PATCH",
      headers: {
        ...writeHeaders,
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "node--x_import_profile_snapshot",
          id: snapshotUuid,
          attributes,
        },
      }),
    });
  } catch {
    // Non-blocking telemetry path.
  }
}

/**
 * Look up the most recent import snapshot for a given username.
 * Optionally filter to a specific status. Returns null if none found or on error.
 */
export async function findLatestSnapshot(
  xUsername: string,
  status?: XImportSnapshotStatus
): Promise<{ uuid: string; runId: string | null; status: XImportSnapshotStatus } | null> {
  try {
    let url = `${DRUPAL_API}/jsonapi/node/x_import_profile_snapshot?filter[field_x_import_username]=${encodeURIComponent(xUsername)}&sort=-changed&page[limit]=1`;
    if (status) {
      url += `&filter[field_x_import_status]=${encodeURIComponent(status)}`;
    }
    const res = await fetch(url, { headers: { ...drupalAuthHeaders() } });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.data?.length) return null;
    const node = json.data[0];
    return {
      uuid: node.id,
      runId: node.attributes?.field_x_import_run_id ?? null,
      status: node.attributes?.field_x_import_status as XImportSnapshotStatus,
    };
  } catch {
    return null;
  }
}

export async function findLatestSnapshotMediaUrls(
  xUsername: string
): Promise<{ profilePicture: string | null; backgroundBanner: string | null } | null> {
  try {
    const cleaned = xUsername.trim().replace(/^@+/, "");
    const candidates = Array.from(new Set([cleaned, cleaned.toLowerCase()].filter(Boolean)));

    for (const candidate of candidates) {
      const params = new URLSearchParams({
        "filter[field_x_import_username]": candidate,
        "filter[field_x_import_status]": "success",
        sort: "-changed",
        "page[limit]": "1",
        "fields[node--x_import_profile_snapshot]": "field_x_import_payload",
      });

      const res = await fetch(
        `${DRUPAL_API}/jsonapi/node/x_import_profile_snapshot?${params.toString()}`,
        { headers: { ...drupalAuthHeaders() } }
      );
      if (!res.ok) continue;

      const json = await res.json();
      const node = json?.data?.[0];
      const rawPayload = node?.attributes?.field_x_import_payload;
      if (typeof rawPayload !== "string" || rawPayload.trim().length === 0) continue;

      const payload = JSON.parse(rawPayload);
      const profilePicture =
        typeof payload?.diagnostics?.mediaUrls?.profilePicture === "string"
          ? payload.diagnostics.mediaUrls.profilePicture
          : null;
      const backgroundBanner =
        typeof payload?.diagnostics?.mediaUrls?.backgroundBanner === "string"
          ? payload.diagnostics.mediaUrls.backgroundBanner
          : null;

      return { profilePicture, backgroundBanner };
    }

    return null;
  } catch {
    return null;
  }
}

export async function uploadImageToDrupal(
  imageUrl: string,
  nodeUuid: string,
  fieldName: string,
  filename: string
): Promise<string | null> {
  if (!isSafeImageUrl(imageUrl)) {
    console.warn(`[x-import] Blocked unsafe image URL: ${imageUrl}`);
    return null;
  }
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.error(`Failed to download image from ${imageUrl}: ${imgRes.status}`);
      return null;
    }

    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const imageBuffer = Buffer.from(await imgRes.arrayBuffer());

    const writeHeaders = await drupalWriteHeaders();
    const uploadRes = await fetch(
      `${DRUPAL_API}/jsonapi/node/x_user_profile/${nodeUuid}/${fieldName}`,
      {
        method: "POST",
        headers: {
          ...writeHeaders,
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `filename="${filename}.${ext}"`,
        },
        body: imageBuffer,
      }
    );

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error(`Drupal file upload failed (${uploadRes.status}):`, text);
      return null;
    }

    const uploadJson = await uploadRes.json();
    return uploadJson.data?.id ?? null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Image upload error for ${fieldName}:`, message);
    return null;
  }
}

export async function getProfileMediaFieldState(
  nodeUuid: string
): Promise<ProfileMediaFieldState | null> {
  try {
    const params = new URLSearchParams({
      include: "field_profile_picture,field_background_banner",
    });

    const res = await fetch(
      `${DRUPAL_API}/jsonapi/node/x_user_profile/${nodeUuid}?${params.toString()}`,
      { headers: { ...drupalAuthHeaders() } }
    );

    if (!res.ok) return null;

    const json = await res.json();
    const relationships = json?.data?.relationships || {};

    return {
      profilePictureFileId: relationships?.field_profile_picture?.data?.id ?? null,
      backgroundBannerFileId: relationships?.field_background_banner?.data?.id ?? null,
    };
  } catch {
    return null;
  }
}

export async function getDrupalFileAssetUrl(fileUuid: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      "fields[file--file]": "uri,changed,drupal_internal__fid",
    });
    const res = await fetch(
      `${DRUPAL_API}/jsonapi/file/file/${fileUuid}?${params.toString()}`,
      { headers: { ...drupalAuthHeaders() } }
    );

    if (!res.ok) return null;

    const json = await res.json();
    const attrs = json?.data?.attributes;
    const raw = drupalAbsoluteUrl(attrs?.uri?.url);
    if (!raw) return null;

    const version = attrs?.changed ?? attrs?.drupal_internal__fid ?? null;
    if (!version) return raw;
    const separator = raw.includes("?") ? "&" : "?";
    return `${raw}${separator}v=${encodeURIComponent(String(version))}`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Full sync: fetch X data + enhance with Grok + write to Drupal
// ---------------------------------------------------------------------------

export async function syncXDataToDrupal(
  xAccessToken: string | undefined,
  xId: string,
  xUsername: string
): Promise<void> {
  try {
    const profile = await findProfileByUsername(xUsername);
    if (!profile) {
      console.log(`[x-sync] No Drupal profile for @${xUsername} — skipping`);
      return;
    }

    const xData = await fetchXData(xAccessToken, xId);

    let enhanced = xData;
    try {
      const { enhanceAndMergeMetrics } = await import("@/lib/grok");
      enhanced = await enhanceAndMergeMetrics(xData);
    } catch (err) {
      console.warn("[x-sync] Grok enhancement skipped:", err);
    }

    const attributes: Record<string, unknown> = {
      field_x_followers: enhanced.followerCount,
      field_x_bio: { value: enhanced.bio, format: "basic_html" },
      field_top_posts: enhanced.topPosts.map((p) => JSON.stringify(p)),
      field_top_followers: enhanced.topFollowers.map((f) => JSON.stringify(f)),
      field_metrics: JSON.stringify(enhanced.metrics),
    };

    await patchProfile(profile.uuid, attributes);

    if (enhanced.profileImageUrl) {
      await uploadImageToDrupal(
        enhanced.profileImageUrl,
        profile.uuid,
        "field_profile_picture",
        `${xUsername}-pfp`
      );
    }
    if (enhanced.bannerUrl) {
      await uploadImageToDrupal(
        enhanced.bannerUrl,
        profile.uuid,
        "field_background_banner",
        `${xUsername}-banner`
      );
    }

    console.log(`[x-sync] Synced X data for @${xUsername} to Drupal`);
  } catch (err) {
    console.error(`[x-sync] Failed for @${xUsername}:`, err);
  }
}
