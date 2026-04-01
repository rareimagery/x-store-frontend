import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

type ArticleJWT = { storeSlug?: string; xUsername?: string };

function resolveSlug(token: ArticleJWT): string | null {
  const raw = token.storeSlug || token.xUsername;
  return raw ? raw.replace(/^@+/, "").trim().toLowerCase() : null;
}

async function resolveStore(slug: string): Promise<{ uuid: string; articles: any[] } | null> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_x_articles`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const store = json.data?.[0];
  if (!store) return null;
  const raw = store.attributes?.field_x_articles;
  let articles: any[] = [];
  if (raw) {
    try { articles = JSON.parse(raw); } catch { /* ignore */ }
  }
  return { uuid: store.id, articles };
}

// GET — load articles for the current user's store
export async function GET(req: NextRequest) {
  const token = await getToken({ req }) as ArticleJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ articles: [] });
  const store = await resolveStore(slug);
  return NextResponse.json({ articles: store?.articles ?? [] });
}

// POST — import articles from X (Drupal fetches) and save to store
export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as ArticleJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ error: "No store" }, { status: 404 });

  const store = await resolveStore(slug);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const { action, username, articles: manualArticles } = await req.json();

  // Action: "import" — tell Drupal to fetch from X
  if (action === "import") {
    const xUser = username || slug;
    const importRes = await fetch(`${DRUPAL_API_URL}/api/x-profile-sync/import-articles`, {
      method: "POST",
      headers: { ...drupalAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ username: xUser }),
      cache: "no-store",
    });

    if (!importRes.ok) {
      const err = await importRes.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || "Import failed" }, { status: 502 });
    }

    const importData = await importRes.json();
    const newArticles = importData.articles ?? [];

    // Merge with existing — dedupe by id
    const existingIds = new Set(store.articles.map((a: any) => a.id));
    const merged = [...store.articles];
    for (const article of newArticles) {
      if (!existingIds.has(article.id)) {
        merged.push(article);
      }
    }

    // Save back to Drupal
    await saveArticles(store.uuid, merged);

    return NextResponse.json({
      articles: merged,
      imported: newArticles.length,
      new: newArticles.filter((a: any) => !existingIds.has(a.id)).length,
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
