import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

type GalleryJWT = { storeSlug?: string; xUsername?: string };

export interface GrokGalleryItem {
  id: string;
  url: string;
  prompt: string;
  name: string;
  type: "image" | "video";
  created_at: string;
  product_type?: string;
  folder?: string;
  saved?: boolean;
}

function resolveSlug(token: GalleryJWT): string | null {
  const raw = token.storeSlug || token.xUsername;
  return raw ? raw.replace(/^@+/, "").trim().toLowerCase() : null;
}

async function resolveStore(slug: string): Promise<{ uuid: string; gallery: GrokGalleryItem[] } | null> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_grok_gallery`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const store = json.data?.[0];
  if (!store) return null;
  const raw = store.attributes?.field_grok_gallery;
  let gallery: GrokGalleryItem[] = [];
  if (raw) { try { gallery = JSON.parse(raw); } catch {} }
  return { uuid: store.id, gallery };
}

// GET — load gallery
export async function GET(req: NextRequest) {
  const token = await getToken({ req }) as GalleryJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ gallery: [] });
  const store = await resolveStore(slug);
  return NextResponse.json({ gallery: store?.gallery ?? [] });
}

// POST — add item or save full gallery
export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as GalleryJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ error: "No store" }, { status: 404 });
  const store = await resolveStore(slug);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const { action, item, gallery: fullGallery } = await req.json();

  let updated: GrokGalleryItem[];

  if (action === "add" && item) {
    updated = [item, ...store.gallery];
  } else if (action === "save" && Array.isArray(fullGallery)) {
    updated = fullGallery;
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const writeHeaders = await drupalWriteHeaders();
  const res = await fetch(`${DRUPAL_API_URL}/jsonapi/commerce_store/online/${store.uuid}`, {
    method: "PATCH",
    headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify({
      data: {
        type: "commerce_store--online",
        id: store.uuid,
        attributes: { field_grok_gallery: JSON.stringify(updated) },
      },
    }),
  });

  if (!res.ok) return NextResponse.json({ error: "Save failed" }, { status: 500 });
  return NextResponse.json({ ok: true, count: updated.length });
}
