import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL } from "@/lib/drupal";

async function getDrupalSessionHeaders(): Promise<Record<string, string>> {
  const user = process.env.DRUPAL_API_USER;
  const pass = process.env.DRUPAL_API_PASS;
  if (!user || !pass) throw new Error("DRUPAL_API_USER/PASS not set");

  // Login to get session cookie
  const loginRes = await fetch(`${DRUPAL_API_URL}/user/login?_format=json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: user, pass }),
  });

  if (!loginRes.ok) throw new Error("Drupal login failed");

  const setCookies = loginRes.headers.getSetCookie?.() || [];
  const sessionCookie = setCookies
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith("SESS") || c.startsWith("SSESS"));

  if (!sessionCookie) {
    const raw = loginRes.headers.get("set-cookie") || "";
    const match = raw.match(/(S?SESS[^=]+=[^;]+)/);
    if (!match) throw new Error("No session cookie");
    return { Cookie: match[1] };
  }

  // Get CSRF
  const csrfRes = await fetch(`${DRUPAL_API_URL}/session/token`, {
    headers: { Cookie: sessionCookie },
  });
  const csrf = csrfRes.ok ? await csrfRes.text() : "";

  return { Cookie: sessionCookie, "X-CSRF-Token": csrf };
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  try {
    const sessionHeaders = await getDrupalSessionHeaders();

    // Forward as multipart to Drupal
    const drupalForm = new FormData();
    drupalForm.append("file", file, file.name);

    const res = await fetch(`${DRUPAL_API_URL}/api/x-profile-sync/upload`, {
      method: "POST",
      headers: sessionHeaders,
      body: drupalForm,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || "Upload failed" }, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (err: any) {
    console.error("[gallery/upload] Failed:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 502 });
  }
}
