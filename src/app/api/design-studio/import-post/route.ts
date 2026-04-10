import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { fetchWithRetry } from "@/lib/x-api/fetch-with-retry";

/**
 * POST /api/design-studio/import-post
 * Fetches an X post by URL and extracts text, images, and engagement metrics.
 * Body: { post_url: string }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_url } = await req.json();
  if (!post_url) return NextResponse.json({ error: "post_url required" }, { status: 400 });

  const match = post_url.match(/(?:x\.com|twitter\.com)\/(\w+)\/status\/(\d+)/);
  if (!match) {
    return NextResponse.json({ error: "Invalid X post URL" }, { status: 400 });
  }

  const [, username, postId] = match;
  const bearerToken = process.env.X_API_BEARER_TOKEN;
  if (!bearerToken) {
    return NextResponse.json({ error: "X API not configured" }, { status: 500 });
  }

  try {
    const params = new URLSearchParams({
      "tweet.fields": "text,attachments,entities,created_at,public_metrics",
      expansions: "attachments.media_keys",
      "media.fields": "url,preview_image_url,type",
    });

    const res = await fetchWithRetry(
      `https://api.x.com/2/tweets/${postId}?${params}`,
      { headers: { Authorization: `Bearer ${bearerToken}` } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Post not found or not accessible" }, { status: 404 });
    }

    const data = await res.json();
    const tweet = data.data;
    if (!tweet) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Extract all images
    const media = data.includes?.media || [];
    const imageUrls: string[] = media
      .map((m: any) => m.url || m.preview_image_url)
      .filter(Boolean);

    // Clean up tweet text (remove t.co URLs)
    let text = tweet.text || "";
    text = text.replace(/https:\/\/t\.co\/\S+/g, "").trim();

    const title = `@${username} — ${text.slice(0, 40)}${text.length > 40 ? "..." : ""}`;

    // Engagement metrics
    const metrics = tweet.public_metrics || {};

    return NextResponse.json({
      text: text || `Design inspired by @${username}'s post`,
      image_url: imageUrls[0] || null,
      image_urls: imageUrls,
      title,
      username,
      post_id: postId,
      created_at: tweet.created_at || null,
      likes: metrics.like_count || 0,
      retweets: metrics.retweet_count || 0,
      replies: metrics.reply_count || 0,
      views: metrics.impression_count || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch post" }, { status: 502 });
  }
}
