/**
 * X API v2 Direct Messages — send DMs from @rareimagery platform account.
 * Uses OAuth 2.0 user token (not app bearer) for DM write access.
 */

const X_API_BASE = "https://api.x.com/2";
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";

export interface DMSendResult {
  success: boolean;
  dmEventId?: string;
  error?: string;
}

/**
 * Refresh the platform's OAuth access token using the stored refresh token.
 * Returns a fresh access token for DM sending.
 */
async function getPlatformAccessToken(): Promise<string | null> {
  const refreshToken = process.env.X_PLATFORM_REFRESH_TOKEN;
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;

  if (!refreshToken || !clientId) return null;

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret || ""}`).toString("base64");
    const res = await fetch(X_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    });

    if (!res.ok) {
      console.error("[dm] Token refresh failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();

    // Update refresh token if rotated (X rotates refresh tokens)
    if (data.refresh_token && data.refresh_token !== refreshToken) {
      console.warn("[dm] X rotated refresh token — update X_PLATFORM_REFRESH_TOKEN in .env.production");
      // In production, you'd want to persist this. For now, log it.
    }

    return data.access_token || null;
  } catch (err) {
    console.error("[dm] Token refresh error:", err);
    return null;
  }
}

/**
 * Send a DM from @rareimagery to a recipient by their X user ID.
 */
export async function sendDMFromPlatform(recipientXId: string, text: string): Promise<DMSendResult> {
  const accessToken = await getPlatformAccessToken();
  if (!accessToken) {
    return { success: false, error: "No platform access token — X_PLATFORM_REFRESH_TOKEN missing or expired" };
  }

  return sendDM(recipientXId, text, accessToken);
}

/**
 * Send a DM using a specific OAuth access token.
 */
export async function sendDM(recipientXId: string, text: string, accessToken: string): Promise<DMSendResult> {
  if (!recipientXId || !text) {
    return { success: false, error: "recipientXId and text required" };
  }

  try {
    const res = await fetch(
      `${X_API_BASE}/dm_conversations/with/${encodeURIComponent(recipientXId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.slice(0, 10000), // X DM limit
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[dm] Send failed:", res.status, err);
      return {
        success: false,
        error: `HTTP ${res.status}: ${err.detail || err.title || "DM send failed"}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      dmEventId: data.data?.dm_event_id,
    };
  } catch (err: any) {
    console.error("[dm] Send error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Look up a user's X ID by username (needed for DM sending).
 */
export async function resolveXId(username: string): Promise<string | null> {
  const bearer = process.env.X_API_BEARER_TOKEN;
  if (!bearer) return null;

  try {
    const res = await fetch(
      `${X_API_BASE}/users/by/username/${encodeURIComponent(username)}?user.fields=id`,
      { headers: { Authorization: `Bearer ${bearer}` }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.id || null;
  } catch {
    return null;
  }
}
