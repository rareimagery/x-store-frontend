import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.X_CLIENT_ID || "";
const CLIENT_SECRET = process.env.X_CLIENT_SECRET || "";

/**
 * POST /api/admin/exchange-token
 * Exchange an OAuth authorization code for access + refresh tokens.
 * Used by the one-time platform token capture page.
 */
export async function POST(req: NextRequest) {
  const { code, state } = await req.json();

  if (!code) {
    return NextResponse.json({ error: "No authorization code" }, { status: 400 });
  }

  if (!CLIENT_ID) {
    return NextResponse.json({ error: "X_CLIENT_ID not configured" }, { status: 500 });
  }

  const redirectUri = `${req.nextUrl.origin}/admin/capture-token`;

  try {
    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

    const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: CLIENT_ID,
        code_verifier: state || "", // Matches the plain PKCE challenge
      }),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok) {
      return NextResponse.json({
        error: data.error_description || data.error || `Token exchange failed (HTTP ${tokenRes.status})`,
      }, { status: 400 });
    }

    return NextResponse.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      scope: data.scope,
      token_type: data.token_type,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
