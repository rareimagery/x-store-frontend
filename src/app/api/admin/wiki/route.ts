import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

const WIKI_NODE_TITLE = "__rareimagery_admin_wiki__";

async function getWikiNode(): Promise<{ uuid: string; sections: any[] } | null> {
  if (!DRUPAL_API_URL) return null;
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/page?filter[title]=${encodeURIComponent(WIKI_NODE_TITLE)}&page[limit]=1`,
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

export async function GET(req: NextRequest) {
  const token = await getToken({ req }) as any;
  if (!token || token.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const node = await getWikiNode();
  return NextResponse.json({ sections: node?.sections || [] });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as any;
  if (!token || token.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { sections } = await req.json();
  if (!Array.isArray(sections)) {
    return NextResponse.json({ error: "sections array required" }, { status: 400 });
  }

  const existing = await getWikiNode();
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
          attributes: { title: WIKI_NODE_TITLE, status: false, body: { value: bodyJson, format: "plain_text" } },
        },
      }),
    });
    if (!res.ok) return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
