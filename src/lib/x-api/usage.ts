// ---------------------------------------------------------------------------
// X API v2 Usage Monitoring — per x-api-integration.md spec
// ---------------------------------------------------------------------------

import { X_API_BASE, xApiHeaders } from "./client";

export async function fetchApiUsage(): Promise<unknown> {
  const res = await fetch(`${X_API_BASE}/usage/tweets`, {
    headers: xApiHeaders(),
  });
  return res.json();
}
