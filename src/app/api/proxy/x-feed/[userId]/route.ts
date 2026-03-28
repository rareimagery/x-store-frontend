import { NextRequest, NextResponse } from "next/server";
import { X_API_BASE, xApiHeaders } from "@/lib/x-api/client";
import { fetchWithRetry } from "@/lib/x-api/fetch-with-retry";
import { createRateLimiter, getClientIP, rateLimitResponse } from "@/lib/rate-limit";
import type { XPost, XMedia } from "@/lib/x-api/types";

const XAI_API_KEY = process.env.XAI_API_KEY;

// Simple in-memory cache: userId -> { data, timestamp }
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const feedRateLimit = createRateLimiter({ limit: 60, windowMs: 60 * 60 * 1000 }); // 60/hour

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ip = getClientIP(req);
  const rl = feedRateLimit(ip);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const { userId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const maxResults = Math.min(
    parseInt(searchParams.get("max_results") || "50", 10),
    100
  );
  const excludeReplies = searchParams.get("exclude_replies") === "true";

  const cacheKey = `${userId}:${maxResults}:${excludeReplies}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Cache": "HIT",
      },
    });
  }

  // Primary: Raw X API v2 via app-only Bearer Token (api.x.com/2/)
  if (process.env.X_API_BEARER_TOKEN) {
    try {
      const tweetsParams = new URLSearchParams({
        max_results: String(maxResults),
        "tweet.fields": [
          "id", "text", "created_at", "public_metrics",
          "attachments", "entities", "referenced_tweets",
        ].join(","),
        expansions: "attachments.media_keys,referenced_tweets.id",
        "media.fields": "media_key,type,url,preview_image_url,width,height,alt_text",
      });

      if (excludeReplies) {
        tweetsParams.set("exclude", "replies,retweets");
      }

      const tweetsRes = await fetchWithRetry(
        `${X_API_BASE}/users/${encodeURIComponent(userId)}/tweets?${tweetsParams}`,
        { headers: xApiHeaders(), next: { revalidate: 900 } } as RequestInit
      );

      if (tweetsRes.ok) {
        const tweetsJson = await tweetsRes.json();
        const rawTweets: XPost[] = tweetsJson.data ?? [];
        const mediaIncludes: XMedia[] = tweetsJson.includes?.media ?? [];

        const mediaMap = new Map<string, XMedia>();
        for (const m of mediaIncludes) {
          if (m.media_key) mediaMap.set(m.media_key, m);
        }

        const posts = rawTweets.map((t) => {
          const pm = t.public_metrics ?? {} as NonNullable<XPost["public_metrics"]>;
          const mediaKeys: string[] = t.attachments?.media_keys ?? [];
          const media = mediaKeys
            .map((k) => mediaMap.get(k))
            .filter(Boolean)
            .map((m) => ({
              type: m!.type ?? "photo",
              url: m!.url ?? m!.preview_image_url ?? "",
              width: m!.width ?? null,
              height: m!.height ?? null,
            }));

          return {
            id: t.id,
            text: t.text ?? "",
            created_at: t.created_at ?? "",
            media,
            metrics: {
              like_count: pm.like_count ?? 0,
              retweet_count: pm.retweet_count ?? 0,
              reply_count: pm.reply_count ?? 0,
            },
            url: `https://x.com/i/status/${t.id}`,
          };
        });

        const result = {
          posts,
          next_token: tweetsJson.meta?.next_token ?? null,
          source: "x-api",
        };

        cache.set(cacheKey, { data: result, timestamp: Date.now() });

        return NextResponse.json(result, {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            "X-Cache": "MISS",
          },
        });
      }
    } catch (err) {
      console.error("[x-feed] X API fetch failed, falling back to Grok:", err);
    }
  }

  // Fallback: xAI Grok API
  if (XAI_API_KEY) {
    try {
      const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${XAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-3",
          messages: [
            {
              role: "system",
              content:
                "You fetch X/Twitter posts for a user. Return a JSON object with a 'posts' array. Each post has: id, text, created_at, media (array of {type, url, width, height}), metrics ({like_count, retweet_count, reply_count}), url. Return only valid JSON, no markdown.",
            },
            {
              role: "user",
              content: `Fetch the ${maxResults} most recent posts from X user ID ${userId}.${
                excludeReplies ? " Exclude replies." : ""
              } Return as JSON with a "posts" array.`,
            },
          ],
          temperature: 0,
          response_format: { type: "json_object" },
        }),
      });

      if (grokRes.ok) {
        const grokData = await grokRes.json();
        const content = grokData.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const result = {
            posts: parsed.posts || [],
            next_token: null,
            source: "grok",
          };

          cache.set(cacheKey, { data: result, timestamp: Date.now() });

          return NextResponse.json(result, {
            headers: {
              "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
              "X-Cache": "MISS",
            },
          });
        }
      }
    } catch (err) {
      console.error("Grok X feed proxy error:", err);
    }
  }

  // Last resort: return empty feed
  return NextResponse.json(
    {
      posts: [],
      next_token: null,
      source: "none",
      error: "No X feed source configured",
    },
    {
      status: 200,
      headers: { "Cache-Control": "public, s-maxage=60" },
    }
  );
}
