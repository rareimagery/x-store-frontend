import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

type SocialJWT = { storeSlug?: string; xUsername?: string };

export interface SocialFeedAccount {
  id: string;
  platform: "tiktok" | "instagram" | "youtube";
  username: string;
  url: string;
  embed_url?: string;
}

function resolveSlug(token: SocialJWT): string | null {
  const raw = token.storeSlug || token.xUsername;
  return raw ? raw.replace(/^@+/, "").trim().toLowerCase() : null;
}

async function resolveStore(slug: string): Promise<{ uuid: string; feeds: SocialFeedAccount[] } | null> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_social_feeds`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const store = json.data?.[0];
  if (!store) return null;
  const raw = store.attributes?.field_social_feeds;
  let feeds: SocialFeedAccount[] = [];
  if (raw) { try { feeds = JSON.parse(raw); } catch {} }
  return { uuid: store.id, feeds };
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req }) as SocialJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ feeds: [] });
  const store = await resolveStore(slug);
  return NextResponse.json({ feeds: store?.feeds ?? [] });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as SocialJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ error: "No store" }, { status: 404 });
  const store = await resolveStore(slug);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const { feeds } = await req.json();
  if (!Array.isArray(feeds)) return NextResponse.json({ error: "feeds array required" }, { status: 400 });

  const writeHeaders = await drupalWriteHeaders();
  const res = await fetch(`${DRUPAL_API_URL}/jsonapi/commerce_store/online/${store.uuid}`, {
    method: "PATCH",
    headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify({
      data: {
        type: "commerce_store--online",
        id: store.uuid,
        attributes: { field_social_feeds: JSON.stringify(feeds) },
      },
    }),
  });

  if (!res.ok) return NextResponse.json({ error: "Save failed" }, { status: 500 });
  return NextResponse.json({ ok: true, count: feeds.length });
}
