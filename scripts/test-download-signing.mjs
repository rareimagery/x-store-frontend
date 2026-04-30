#!/usr/bin/env node
/**
 * Unit tests for src/lib/download-signing.ts
 * Run: node --test scripts/test-download-signing.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

process.env.DOWNLOAD_SIGNING_SECRET = "test-secret-for-unit-tests-only";

const SIGNING_SECRET = process.env.DOWNLOAD_SIGNING_SECRET;

function signDownload(orderId, itemId, expiresAt) {
  const payload = `${orderId}:${itemId}:${expiresAt}`;
  return crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(payload)
    .digest("base64url");
}

function verifyDownload(orderId, itemId, expiresAt, signature) {
  if (Date.now() > expiresAt) return { valid: false, reason: "expired" };
  const expected = signDownload(orderId, itemId, expiresAt);
  try {
    const a = Buffer.from(expected, "base64url");
    const b = Buffer.from(signature, "base64url");
    if (a.length !== b.length) return { valid: false, reason: "invalid" };
    if (!crypto.timingSafeEqual(a, b)) return { valid: false, reason: "invalid" };
    return { valid: true };
  } catch {
    return { valid: false, reason: "invalid" };
  }
}

function buildSignedDownloadUrl(baseUrl, orderId, itemId, ttlMs = 24 * 60 * 60 * 1000) {
  const expiresAt = Date.now() + ttlMs;
  const sig = signDownload(orderId, itemId, expiresAt);
  const params = new URLSearchParams({
    o: orderId,
    i: itemId,
    e: String(expiresAt),
    s: sig,
  });
  return { url: `${baseUrl}/api/download/verify?${params.toString()}`, expiresAt };
}

test("sign/verify round-trip succeeds", () => {
  const expiresAt = Date.now() + 60_000;
  const sig = signDownload("order-abc", "item-xyz", expiresAt);
  const result = verifyDownload("order-abc", "item-xyz", expiresAt, sig);
  assert.equal(result.valid, true);
});

test("expired token is rejected", () => {
  const expiresAt = Date.now() - 1000;
  const sig = signDownload("order-abc", "item-xyz", expiresAt);
  const result = verifyDownload("order-abc", "item-xyz", expiresAt, sig);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "expired");
});

test("tampered orderId is rejected", () => {
  const expiresAt = Date.now() + 60_000;
  const sig = signDownload("order-abc", "item-xyz", expiresAt);
  const result = verifyDownload("order-EVIL", "item-xyz", expiresAt, sig);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "invalid");
});

test("tampered itemId is rejected", () => {
  const expiresAt = Date.now() + 60_000;
  const sig = signDownload("order-abc", "item-xyz", expiresAt);
  const result = verifyDownload("order-abc", "item-EVIL", expiresAt, sig);
  assert.equal(result.valid, false);
});

test("tampered expiry is rejected", () => {
  const expiresAt = Date.now() + 60_000;
  const sig = signDownload("order-abc", "item-xyz", expiresAt);
  const result = verifyDownload("order-abc", "item-xyz", expiresAt + 1000, sig);
  assert.equal(result.valid, false);
});

test("garbage signature is rejected without throwing", () => {
  const expiresAt = Date.now() + 60_000;
  const result = verifyDownload("order-abc", "item-xyz", expiresAt, "not-base64!!");
  assert.equal(result.valid, false);
});

test("buildSignedDownloadUrl produces a verifiable URL", () => {
  const { url, expiresAt } = buildSignedDownloadUrl(
    "https://rareimagery.net",
    "order-1",
    "var-1",
  );
  const params = new URLSearchParams(url.split("?")[1]);
  assert.equal(params.get("o"), "order-1");
  assert.equal(params.get("i"), "var-1");
  assert.equal(parseInt(params.get("e"), 10), expiresAt);
  const check = verifyDownload(
    params.get("o"),
    params.get("i"),
    parseInt(params.get("e"), 10),
    params.get("s"),
  );
  assert.equal(check.valid, true);
});
