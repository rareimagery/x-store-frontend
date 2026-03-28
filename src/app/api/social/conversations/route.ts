import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { xApiHeaders, xUserHeaders } from "@/lib/x-api/client";
import {
  type ConversationItem,
  getRareProjectHandle,
  normalizeHandle,
  searchConversations,
} from "@/lib/x-api/conversations";

function getTargetHandle(req: NextRequest): string {
  const requested = normalizeHandle(req.nextUrl.searchParams.get("target"));
  return requested || getRareProjectHandle();
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  const myHandle = normalizeHandle(token?.xUsername as string | undefined);
  const myUserId = (token?.xId as string | undefined) || "";
  const accessToken = token?.xAccessToken as string | undefined;

  if (!myHandle || !myUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetHandle = getTargetHandle(req);
  if (!targetHandle) {
    return NextResponse.json(
      { error: "RareProject X handle is not configured" },
      { status: 500 }
    );
  }

  try {
    let items: ConversationItem[] = [];
    let source = "user-token";

    if (accessToken) {
      try {
        items = await searchConversations(
          myHandle,
          targetHandle,
          xUserHeaders(accessToken)
        );
      } catch (error) {
        console.warn("[x-conversations] User token search failed, falling back to app token:", error);
      }
    }

    if (!items.length) {
      items = await searchConversations(myHandle, targetHandle, xApiHeaders());
      source = "app-token";
    }

    return NextResponse.json({
      targetHandle,
      myHandle,
      source,
      items,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch X conversations";
    console.error("[x-conversations] Failed to fetch conversations:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}