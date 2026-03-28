// ---------------------------------------------------------------------------
// X API v2 Client — per x-api-integration.md spec
// Base URL: https://api.x.com/2/ (NOT api.twitter.com)
// ---------------------------------------------------------------------------

export const X_API_BASE = "https://api.x.com/2";

export function xApiHeaders(bearerToken?: string): Record<string, string> {
  const token = bearerToken ?? process.env.X_API_BEARER_TOKEN;
  if (!token) throw new Error("X_API_BEARER_TOKEN not configured");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function xUserHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}
