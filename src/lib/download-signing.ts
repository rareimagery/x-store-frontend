import crypto from "crypto";

const SIGNING_SECRET =
  process.env.DOWNLOAD_SIGNING_SECRET || process.env.NEXTAUTH_SECRET || "";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

if (!SIGNING_SECRET && process.env.NODE_ENV === "production") {
  console.warn(
    "[download-signing] No DOWNLOAD_SIGNING_SECRET or NEXTAUTH_SECRET set",
  );
}

export function signDownload(
  orderId: string,
  itemId: string,
  expiresAt: number,
): string {
  const payload = `${orderId}:${itemId}:${expiresAt}`;
  return crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(payload)
    .digest("base64url");
}

export function verifyDownload(
  orderId: string,
  itemId: string,
  expiresAt: number,
  signature: string,
): { valid: boolean; reason?: string } {
  if (Date.now() > expiresAt) {
    return { valid: false, reason: "expired" };
  }
  const expected = signDownload(orderId, itemId, expiresAt);
  try {
    const a = Buffer.from(expected, "base64url");
    const b = Buffer.from(signature, "base64url");
    if (a.length !== b.length) return { valid: false, reason: "invalid" };
    if (!crypto.timingSafeEqual(a, b)) {
      return { valid: false, reason: "invalid" };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: "invalid" };
  }
}

export function buildSignedDownloadUrl(
  baseUrl: string,
  orderId: string,
  itemId: string,
  ttlMs: number = DEFAULT_TTL_MS,
): { url: string; expiresAt: number } {
  const expiresAt = Date.now() + ttlMs;
  const sig = signDownload(orderId, itemId, expiresAt);
  const params = new URLSearchParams({
    o: orderId,
    i: itemId,
    e: String(expiresAt),
    s: sig,
  });
  return {
    url: `${baseUrl}/api/download/verify?${params.toString()}`,
    expiresAt,
  };
}
