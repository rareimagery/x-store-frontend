import { NextRequest, NextResponse } from "next/server";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

const NODE_TITLE = "__rareimagery_public_wiki__";

async function getNode(): Promise<{ uuid: string; sections: any[] } | null> {
  if (!DRUPAL_API_URL) return null;
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/page?filter[title]=${encodeURIComponent(NODE_TITLE)}&page[limit]=1`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const node = json.data?.[0];
    if (!node) return null;
    const body = node.attributes?.body?.value || "[]";
    try {
      return { uuid: node.id, sections: JSON.parse(body) };
    } catch {
      return { uuid: node.id, sections: [] };
    }
  } catch {
    return null;
  }
}

/** GET /api/public-wiki — public, no auth */
export async function GET() {
  const node = await getNode();
  return NextResponse.json({ sections: node?.sections || [] });
}

/** POST /api/public-wiki — CRON_SECRET auth for agent writes */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sections } = await req.json();
  if (!Array.isArray(sections)) {
    return NextResponse.json({ error: "sections array required" }, { status: 400 });
  }

  const existing = await getNode();
  const writeHeaders = await drupalWriteHeaders();
  const bodyJson = JSON.stringify(sections);

  if (existing) {
    const res = await fetch(`${DRUPAL_API_URL}/jsonapi/node/page/${existing.uuid}`, {
      method: "PATCH",
      headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: { type: "node--page", id: existing.uuid, attributes: { body: { value: bodyJson, format: "plain_text" } } },
      }),
    });
    if (!res.ok) return NextResponse.json({ error: "Save failed" }, { status: 500 });
  } else {
    const res = await fetch(`${DRUPAL_API_URL}/jsonapi/node/page`, {
      method: "POST",
      headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: {
          type: "node--page",
          attributes: { title: NODE_TITLE, status: false, body: { value: bodyJson, format: "plain_text" } },
        },
      }),
    });
    if (!res.ok) return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
