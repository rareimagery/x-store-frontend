import { NextResponse } from "next/server";

/**
 * Debug: Test X OAuth 2.0 credentials by hitting the token endpoint directly.
 * GET /api/debug/x-oauth-test
 *
 * This tests whether X accepts our client credentials at all.
 */
export async function GET() {
  const clientId = process.env.X_CLIENT_ID || process.env.X_CONSUMER_KEY || "";
  const clientSecret = process.env.X_CLIENT_SECRET || process.env.X_CONSUMER_SECRET || "";

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    client_id_length: clientId.length,
    client_secret_length: clientSecret.length,
    tests: {} as Record<string, unknown>,
  };

  // Test 1: Check if api.x.com token endpoint is reachable
  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }).toString(),
    });

    const tokenBody = await tokenRes.text();
    (results.tests as Record<string, unknown>)["api_x_com_token"] = {
      status: tokenRes.status,
      statusText: tokenRes.statusText,
      body: tokenBody.slice(0, 500),
    };
  } catch (err) {
    (results.tests as Record<string, unknown>)["api_x_com_token"] = {
      error: String(err),
    };
  }

  // Test 2: Check if api.twitter.com token endpoint works (old domain)
  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }).toString(),
    });

    const tokenBody = await tokenRes.text();
    (results.tests as Record<string, unknown>)["api_twitter_com_token"] = {
      status: tokenRes.status,
      statusText: tokenRes.statusText,
      body: tokenBody.slice(0, 500),
    };
  } catch (err) {
    (results.tests as Record<string, unknown>)["api_twitter_com_token"] = {
      error: String(err),
    };
  }

  // Test 3: Check bearer token works for user lookup
  try {
    const bearerToken = process.env.X_API_BEARER_TOKEN;
    if (bearerToken) {
      const userRes = await fetch(
        "https://api.x.com/2/users/me",
        {
          headers: { Authorization: `Bearer ${bearerToken}` },
        }
      );
      const userBody = await userRes.text();
      (results.tests as Record<string, unknown>)["bearer_users_me"] = {
        status: userRes.status,
        body: userBody.slice(0, 500),
      };
    } else {
      (results.tests as Record<string, unknown>)["bearer_users_me"] = {
        skipped: "X_API_BEARER_TOKEN not set",
      };
    }
  } catch (err) {
    (results.tests as Record<string, unknown>)["bearer_users_me"] = {
      error: String(err),
    };
  }

  return NextResponse.json(results);
}
