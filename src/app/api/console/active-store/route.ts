import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConsoleProfiles, getConsoleProfilesByEmail } from "@/lib/drupal";

const COOKIE_NAME = "ri_active_store_id";

type ConsoleSession = {
  xUsername?: string;
  storeSlug?: string;
  user?: {
    email?: string | null;
  };
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const consoleSession = session as ConsoleSession;

  const body = await req.json().catch(() => ({}));
  let requestedStoreId = String(body?.storeId || "").trim();
  const requestedSlug = String(body?.storeSlug || "").trim();

  const isAdmin = (session as any).role === "admin";

  // Resolve slug to storeId if needed
  if (!requestedStoreId && requestedSlug) {
    try {
      const { DRUPAL_API_URL, drupalAuthHeaders } = await import("@/lib/drupal");
      const slugRes = await fetch(
        `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(requestedSlug)}&fields[commerce_store--online]=drupal_internal__store_id`,
        { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
      );
      if (slugRes.ok) {
        const slugJson = await slugRes.json();
        const storeUuid = slugJson.data?.[0]?.id;
        if (storeUuid) requestedStoreId = storeUuid;
      }
    } catch {}
  }

  if (!requestedStoreId) {
    return NextResponse.json({ error: "storeId or storeSlug is required" }, { status: 400 });
  }

  // Admins can switch to any store
  if (!isAdmin) {
    const xUsername = consoleSession.xUsername || consoleSession.storeSlug || null;
    let stores = xUsername ? await getConsoleProfiles(xUsername) : [];
    if (!stores.length && consoleSession.user?.email) {
      stores = await getConsoleProfilesByEmail(consoleSession.user.email);
    }
    const ownsRequestedStore = stores.some((store) => store.storeId === requestedStoreId);
    if (!ownsRequestedStore) {
      return NextResponse.json({ error: "Store not available for this account" }, { status: 403 });
    }
  }

  const res = NextResponse.json({ success: true, activeStoreId: requestedStoreId });
  res.cookies.set(COOKIE_NAME, requestedStoreId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
