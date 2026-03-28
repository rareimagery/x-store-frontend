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
  const requestedStoreId = String(body?.storeId || "").trim();
  if (!requestedStoreId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  const xUsername = consoleSession.xUsername || consoleSession.storeSlug || null;

  let stores = xUsername ? await getConsoleProfiles(xUsername) : [];
  if (!stores.length && consoleSession.user?.email) {
    stores = await getConsoleProfilesByEmail(consoleSession.user.email);
  }

  const ownsRequestedStore = stores.some((store) => store.storeId === requestedStoreId);
  if (!ownsRequestedStore) {
    return NextResponse.json({ error: "Store not available for this account" }, { status: 403 });
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
