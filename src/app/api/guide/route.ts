import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

/**
 * GET /api/guide — Load guide content overrides
 * POST /api/guide — Save guide content overrides (admin only)
 *
 * Stores guide content as JSON in a Drupal node field.
 * We use a dedicated x_user_profile node with a known title "guide_content".
 */

const GUIDE_NODE_TITLE = "__rareimagery_guide_content__";

async function getGuideNode(): Promise<{ uuid: string; content: Record<string, any> } | null> {
  if (!DRUPAL_API_URL) return null;
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/page?filter[title]=${encodeURIComponent(GUIDE_NODE_TITLE)}&page[limit]=1`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const node = json.data?.[0];
    if (!node) return null;
    const body = node.attributes?.body?.value || "{}";
    try {
      return { uuid: node.id, content: JSON.parse(body) };
    } catch {
      return { uuid: node.id, content: {} };
    }
  } catch {
    return null;
  }
}

export async function GET() {
  const node = await getGuideNode();
  return NextResponse.json({ content: node?.content || {} });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as any;
  if (!token || token.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { content } = await req.json();
  if (!content || typeof content !== "object") {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const existing = await getGuideNode();
  const writeHeaders = await drupalWriteHeaders();
  const bodyJson = JSON.stringify(content);

  if (existing) {
    // Update existing node
    const res = await fetch(`${DRUPAL_API_URL}/jsonapi/node/page/${existing.uuid}`, {
      method: "PATCH",
      headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: {
          type: "node--page",
          id: existing.uuid,
          attributes: { body: { value: bodyJson, format: "plain_text" } },
        },
      }),
    });
    if (!res.ok) return NextResponse.json({ error: "Save failed" }, { status: 500 });
  } else {
    // Create new node
    const res = await fetch(`${DRUPAL_API_URL}/jsonapi/node/page`, {
      method: "POST",
      headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: {
          type: "node--page",
          attributes: {
            title: GUIDE_NODE_TITLE,
            status: false, // unpublished — just used as storage
            body: { value: bodyJson, format: "plain_text" },
          },
        },
      }),
    });
    if (!res.ok) return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
