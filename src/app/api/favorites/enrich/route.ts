import { NextRequest, NextResponse } from "next/server";
import { X_API_BASE, xApiHeaders } from "@/lib/x-api/client";
import { fetchWithRetry } from "@/lib/x-api/fetch-with-retry";
import { upgradeProfileImageUrl } from "@/lib/x-api/utils";

/**
 * POST /api/favorites/enrich
 * Batch-fetches X profiles + pinned tweet + 2 recent tweets for a list of usernames.
 * Body: { usernames: string[] }
 */
export async function POST(req: NextRequest) {
  const { usernames } = await req.json();
  if (!Array.isArray(usernames) || usernames.length === 0) {
    return NextResponse.json({ error: "usernames required" }, { status: 400 });
  }

  const bearerToken = process.env.X_API_BEARER_TOKEN;
  if (!bearerToken) {
    return NextResponse.json({ error: "X API not configured" }, { status: 500 });
  }

  const results: Record<string, any> = {};

  // Batch lookup users (up to 100 at a time)
  const chunk = usernames.slice(0, 30); // cap to avoid rate limits
  try {
    const params = new URLSearchParams({
      usernames: chunk.join(","),
      "user.fields": "id,name,username,description,profile_image_url,public_metrics,verified_type,location,pinned_tweet_id",
      expansions: "pinned_tweet_id",
      "tweet.fields": "text,created_at,public_metrics,attachments,entities",
      "media.fields": "url,preview_image_url,type",
    });

    const res = await fetchWithRetry(
      `${X_API_BASE}/users/by?${params}`,
      { headers: xApiHeaders() }
    );

    if (res.ok) {
      const json = await res.json();
      const users = json.data || [];
      const includedTweets = json.includes?.tweets || [];

      for (const user of users) {
        const pm = user.public_metrics ?? {};
        let avatar = user.profile_image_url ?? null;
        if (avatar) avatar = upgradeProfileImageUrl(avatar);

        const pinnedTweet = user.pinned_tweet_id
          ? includedTweets.find((t: any) => t.id === user.pinned_tweet_id)
          : null;

        results[user.username.toLowerCase()] = {
          id: user.id,
          username: user.username,
          display_name: user.name,
          bio: user.description ?? "",
          profile_image_url: avatar,
          location: user.location ?? "",
          follower_count: pm.followers_count ?? 0,
          following_count: pm.following_count ?? 0,
          verified: (user.verified_type ?? "none") !== "none",
          pinned_tweet: pinnedTweet ? {
            id: pinnedTweet.id,
            text: pinnedTweet.text,
            date: pinnedTweet.created_at,
            likes: pinnedTweet.public_metrics?.like_count ?? 0,
            retweets: pinnedTweet.public_metrics?.retweet_count ?? 0,
            views: pinnedTweet.public_metrics?.impression_count ?? 0,
          } : null,
          recent_posts: [], // filled below
        };
      }
    }
  } catch (err: any) {
    console.error("[favorites/enrich] batch lookup failed:", err.message);
  }

  // Fetch 2 recent tweets per user (parallel, with rate limit awareness)
  const userEntries = Object.entries(results);
  const timelinePromises = userEntries.map(async ([key, user]) => {
    try {
      const params = new URLSearchParams({
        max_results: "3",
        exclude: "retweets,replies",
        "tweet.fields": "id,text,created_at,public_metrics,attachments",
        expansions: "attachments.media_keys",
        "media.fields": "url,preview_image_url,type",
      });

      const res = await fetchWithRetry(
        `${X_API_BASE}/users/${user.id}/tweets?${params}`,
        { headers: xApiHeaders() }
      );

      if (res.ok) {
        const json = await res.json();
        const tweets = (json.data || []).slice(0, 2);
        const media = json.includes?.media || [];

        user.recent_posts = tweets.map((t: any) => {
          let imageUrl: string | null = null;
          if (t.attachments?.media_keys?.length) {
            const m = media.find((m: any) => m.media_key === t.attachments.media_keys[0]);
            if (m) imageUrl = m.url || m.preview_image_url || null;
          }
          return {
            id: t.id,
            text: t.text,
            date: t.created_at,
            image_url: imageUrl,
            likes: t.public_metrics?.like_count ?? 0,
            retweets: t.public_metrics?.retweet_count ?? 0,
            views: t.public_metrics?.impression_count ?? 0,
          };
        });
      }
    } catch {}
  });

  await Promise.all(timelinePromises);

  return NextResponse.json({ profiles: results }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
