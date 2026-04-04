import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

type MusicJWT = { storeSlug?: string; xUsername?: string };

function resolveSlug(token: MusicJWT): string | null {
  const raw = token.storeSlug || token.xUsername;
  return raw ? raw.replace(/^@+/, "").trim().toLowerCase() : null;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  provider: "spotify" | "apple_music";
  artwork_url?: string;
}

async function resolveStore(slug: string): Promise<{ uuid: string; tracks: MusicTrack[] } | null> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_music_player`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const store = json.data?.[0];
  if (!store) return null;
  const raw = store.attributes?.field_music_player;
  let tracks: MusicTrack[] = [];
  if (raw) {
    try { tracks = JSON.parse(raw); } catch { /* ignore */ }
  }
  return { uuid: store.id, tracks };
}

async function saveTracks(storeUuid: string, tracks: MusicTrack[]): Promise<boolean> {
  const writeHeaders = await drupalWriteHeaders();
  const res = await fetch(`${DRUPAL_API_URL}/jsonapi/commerce_store/online/${storeUuid}`, {
    method: "PATCH",
    headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify({
      data: {
        type: "commerce_store--online",
        id: storeUuid,
        attributes: { field_music_player: JSON.stringify(tracks) },
      },
    }),
  });
  return res.ok;
}

// GET — load music tracks
export async function GET(req: NextRequest) {
  const token = await getToken({ req }) as MusicJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ tracks: [] });
  const store = await resolveStore(slug);
  return NextResponse.json({ tracks: store?.tracks ?? [] }, {
    headers: { "Cache-Control": "no-store" },
  });
}

// POST — add/save tracks
export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as MusicJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ error: "No store" }, { status: 404 });
  const store = await resolveStore(slug);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const { tracks } = await req.json();
  if (!Array.isArray(tracks)) {
    return NextResponse.json({ error: "tracks array required" }, { status: 400 });
  }

  const ok = await saveTracks(store.uuid, tracks);
  if (!ok) return NextResponse.json({ error: "Save failed" }, { status: 500 });
  return NextResponse.json({ ok: true, count: tracks.length });
}
