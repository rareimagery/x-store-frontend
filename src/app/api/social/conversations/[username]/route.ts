import { NextRequest, NextResponse } from "next/server";

import { getCreatorProfile } from "@/lib/drupal";
import { getRareProjectHandle, normalizeHandle, searchConversations } from "@/lib/x-api/conversations";
import { xApiHeaders } from "@/lib/x-api/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const creatorHandle = normalizeHandle(username);
  if (!creatorHandle) {
    return NextResponse.json({ error: "Creator handle is required" }, { status: 400 });
  }

  const profile = await getCreatorProfile(creatorHandle);
  if (!profile || profile.store_status !== "approved") {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const targetHandle = normalizeHandle(req.nextUrl.searchParams.get("target")) || getRareProjectHandle();

  try {
    const items = await searchConversations(creatorHandle, targetHandle, xApiHeaders(), 12);
    return NextResponse.json(
      {
        creatorHandle,
        targetHandle,
        source: "app-token",
        items,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch storefront conversations";
    console.error("[store-conversations] Failed to fetch storefront conversations:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}