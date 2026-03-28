// ---------------------------------------------------------------------------
// X API v2 Fetch with Retry — per x-api-integration.md spec
// Exponential backoff on 429 with x-rate-limit-reset header support
// ---------------------------------------------------------------------------

import { XApiError } from "./errors";

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);

    if (res.status !== 429) return res;

    if (attempt === maxRetries) {
      throw new XApiError(429, {
        detail: "Rate limit exceeded after retries",
      });
    }

    const resetAt = res.headers.get("x-rate-limit-reset");
    const waitMs = resetAt
      ? Math.max(0, Number(resetAt) * 1000 - Date.now())
      : 1000 * Math.pow(2, attempt);

    console.warn(
      `[X API] Rate limited. Waiting ${waitMs}ms before retry ${attempt + 1}`
    );
    await new Promise((r) => setTimeout(r, waitMs));
  }
  throw new XApiError(429, {});
}
