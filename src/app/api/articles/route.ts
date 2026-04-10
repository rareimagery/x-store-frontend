import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { fetchXProfile } from "@/lib/x-api/user";
import { fetchUserTimeline } from "@/lib/x-api/timeline";

type ArticleJWT = { storeSlug?: string; xUsername?: string | null };

function resolveSlug(token: ArticleJWT): string | null {
  const raw = token.storeSlug || token.xUsername;
  return raw ? raw.replace(/^@+/, "").trim().toLowerCase() : null;
}

async function resolveStore(
  slug: string,
  xUsername?: string
): Promise<{ uuid: string; articles: any[] } | null> {
  // Try by store slug first
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_x_articles`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );
  if (res.ok) {
    const json = await res.json();
    const store = json.data?.[0];
    if (store) {
      let articles: any[] = [];
      const raw = store.attributes?.field_x_articles;
      if (raw) try { articles = JSON.parse(raw); } catch {}
      return { uuid: store.id, articles };
    }
  }

  // Fallback: find store via X profile relationship (slug may have changed)
  if (xUsername && xUsername !== slug) {
    const profileRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?filter[field_x_username]=${encodeURIComponent(xUsername)}&include=field_linked_store&fields[commerce_store--online]=field_x_articles`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (profileRes.ok) {
      const pJson = await profileRes.json();
      const storeRef = pJson.data?.[0]?.relationships?.field_linked_store?.data;
      if (storeRef?.id) {
        // Fetch the store's articles
        const storeIncluded = (pJson.included || []).find((i: any) => i.id === storeRef.id);
        let articles: any[] = [];
        const raw = storeIncluded?.attributes?.field_x_articles;
        if (raw) try { articles = JSON.parse(raw); } catch {}
        return { uuid: storeRef.id, articles };
      }
    }
  }

  return null;
}

// Fetch long-form posts directly from X API (real articles / note_tweets)
async function fetchXArticlesFromApi(xUsername: string): Promise<any[]> {
  try {
    // Get user ID from username
    const profileRes = await fetchXProfile(xUsername);
    const userId = profileRes.data?.id;
    if (!userId) return [];

    // Fetch recent tweets (up to 50) — filter for long-form content
    const timeline = await fetchUserTimeline(userId, {
      maxResults: 50,
      exclude: ["retweets", "replies"],
    });

    const tweets = timeline.data || [];
    const media = timeline.includes?.media || [];

    // Build media lookup
    const mediaMap = new Map<string, any>();
    for (const m of media) {
      if (m.media_key) mediaMap.set(m.media_key, m);
    }

    // Filter for long-form content (> 280 chars = note_tweet / article)
    const articles = tweets
      .filter((tweet: any) => {
        const text = tweet.text || "";
        // Real articles / note_tweets are > 280 chars
        // Also include any tweet with "article" in entities
        return text.length > 280;
      })
      .map((tweet: any) => {
        const text = tweet.text || "";
        const metrics = tweet.public_metrics || {};

        // Get first image from attachments
        let imageUrl: string | null = null;
        const mediaKeys = tweet.attachments?.media_keys || [];
        for (const key of mediaKeys) {
          const m = mediaMap.get(key);
          if (m && (m.url || m.preview_image_url)) {
            imageUrl = m.url || m.preview_image_url;
            break;
          }
        }

        // Title = first line or first sentence
        const firstLine = text.split("\n")[0].replace(/https:\/\/t\.co\/\S+/g, "").trim();
        const title = firstLine.length > 100 ? firstLine.slice(0, 100) + "..." : firstLine;

        // Intro = first ~220 chars, cleaned
        const cleanText = text.replace(/https:\/\/t\.co\/\S+/g, "").trim();
        const intro = cleanText.length > 220 ? cleanText.slice(0, 220) + "..." : cleanText;

        return {
          id: tweet.id,
          title: title || "X Article",
          intro,
          x_url: `https://x.com/${xUsername}/status/${tweet.id}`,
          image_url: imageUrl,
          date: tweet.created_at || new Date().toISOString(),
          likes: metrics.like_count || 0,
          retweets: metrics.retweet_count || 0,
          views: metrics.impression_count || 0,
          content_preview: cleanText.slice(0, 500),
        };
      })
      .slice(0, 20);

    return articles;
  } catch (err) {
    console.error("[articles] X API fetch failed:", err);
    return [];
  }
}

// GET — load articles for the current user's store
export async function GET(req: NextRequest) {
  const token = await getToken({ req }) as ArticleJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ articles: [] });
  const xUsername = token.xUsername ? String(token.xUsername).replace(/^@+/, "").trim().toLowerCase() : undefined;
  const store = await resolveStore(slug, xUsername);
  return NextResponse.json({ articles: store?.articles ?? [] });
}

// POST — import articles from X API and save to store
export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as ArticleJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ error: "No store" }, { status: 404 });

  const xUsername = token.xUsername ? String(token.xUsername).replace(/^@+/, "").trim().toLowerCase() : slug;
  const store = await resolveStore(slug, xUsername);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const { action, articles: manualArticles } = await req.json();

  if (action === "import") {
    // Fetch directly from X API — no more Drupal middleman
    const newArticles = await fetchXArticlesFromApi(xUsername);

    if (newArticles.length === 0) {
      return NextResponse.json({
        articles: store.articles,
        imported: 0,
        new: 0,
        message: "No long-form articles found. Articles are posts longer than 280 characters.",
      });
    }

    // Merge with existing — dedupe by id, newest first
    const existingIds = new Set(store.articles.map((a: any) => a.id));
    const merged = [...store.articles];
    let newCount = 0;
    for (const article of newArticles) {
      if (!existingIds.has(article.id)) {
        merged.unshift(article);
        newCount++;
      }
    }

    // Sort by date, newest first
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    await saveArticles(store.uuid, merged);

    return NextResponse.json({
      articles: merged,
      imported: newArticles.length,
      new: newCount,
    });
  }

  // Action: "save" — save manually edited list
  if (action === "save" && Array.isArray(manualArticles)) {
    await saveArticles(store.uuid, manualArticles);
    return NextResponse.json({ ok: true, count: manualArticles.length });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

async function saveArticles(storeUuid: string, articles: any[]): Promise<void> {
  const writeHeaders = await drupalWriteHeaders();
  await fetch(`${DRUPAL_API_URL}/jsonapi/commerce_store/online/${storeUuid}`, {
    method: "PATCH",
    headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify({
      data: {
        type: "commerce_store--online",
        id: storeUuid,
        attributes: { field_x_articles: JSON.stringify(articles) },
      },
    }),
  });
}
