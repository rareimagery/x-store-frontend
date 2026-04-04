import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

type CommunityJWT = { storeSlug?: string; xUsername?: string };

export interface XCommunity {
  id: string;
  name: string;
  description: string;
  member_count: number;
  url: string;
}

function resolveSlug(token: CommunityJWT): string | null {
  const raw = token.storeSlug || token.xUsername;
  return raw ? raw.replace(/^@+/, "").trim().toLowerCase() : null;
}

async function resolveStore(slug: string): Promise<{ uuid: string; communities: XCommunity[] } | null> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_x_communities`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const store = json.data?.[0];
  if (!store) return null;
  const raw = store.attributes?.field_x_communities;
  let communities: XCommunity[] = [];
  if (raw) { try { communities = JSON.parse(raw); } catch {} }
  return { uuid: store.id, communities };
}

// GET — load communities
export async function GET(req: NextRequest) {
  const token = await getToken({ req }) as CommunityJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ communities: [] });
  const store = await resolveStore(slug);
  return NextResponse.json({ communities: store?.communities ?? [] }, {
    headers: { "Cache-Control": "no-store" },
  });
}

// POST — save communities
export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as CommunityJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ error: "No store" }, { status: 404 });
  const store = await resolveStore(slug);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const { communities } = await req.json();
  if (!Array.isArray(communities)) {
    return NextResponse.json({ error: "communities array required" }, { status: 400 });
  }

  const writeHeaders = await drupalWriteHeaders();
  const res = await fetch(`${DRUPAL_API_URL}/jsonapi/commerce_store/online/${store.uuid}`, {
    method: "PATCH",
    headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify({
      data: {
        type: "commerce_store--online",
        id: store.uuid,
        attributes: { field_x_communities: JSON.stringify(communities) },
      },
    }),
  });

  if (!res.ok) return NextResponse.json({ error: "Save failed" }, { status: 500 });
  return NextResponse.json({ ok: true, count: communities.length });
}
