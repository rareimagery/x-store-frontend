import { NextResponse } from "next/server";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

/**
 * GET /api/health/drupal-sync
 * Validates Drupal connectivity: JSON:API read, store field access, grace table.
 */
export async function GET() {
  const start = Date.now();
  const checks: { name: string; ok: boolean; ms: number; detail?: string }[] = [];

  // 1. JSON:API connectivity — fetch any store
  try {
    const t0 = Date.now();
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?page[limit]=1&fields[commerce_store--online]=field_store_slug`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    const json = await res.json();
    checks.push({
      name: "jsonapi_read",
      ok: res.ok && Array.isArray(json.data),
      ms: Date.now() - t0,
      detail: res.ok ? `${json.data?.length ?? 0} stores returned` : `HTTP ${res.status}`,
    });
  } catch (err: any) {
    checks.push({ name: "jsonapi_read", ok: false, ms: Date.now() - start, detail: err.message });
  }

  // 2. Check-slug endpoint (custom module)
  try {
    const t0 = Date.now();
    const res = await fetch(
      `${DRUPAL_API_URL}/api/creator/check-slug?slug=console`,
      { headers: drupalAuthHeaders(), cache: "no-store" }
    );
    const data = await res.json();
    checks.push({
      name: "custom_module",
      ok: res.ok && data.available === false && data.reason === "Reserved name",
      ms: Date.now() - t0,
      detail: res.ok ? `check-slug working (console=${data.available ? "available" : "reserved"})` : `HTTP ${res.status}`,
    });
  } catch (err: any) {
    checks.push({ name: "custom_module", ok: false, ms: Date.now() - start, detail: err.message });
  }

  // 3. Grace period table (read — no write)
  try {
    const t0 = Date.now();
    const res = await fetch(
      `${DRUPAL_API_URL}/api/grace-status/healthcheck/healthcheck`,
      { headers: drupalAuthHeaders(), cache: "no-store" }
    );
    const data = await res.json();
    checks.push({
      name: "grace_table",
      ok: res.ok && data.status === "no_record",
      ms: Date.now() - t0,
      detail: res.ok ? "Grace period table accessible" : `HTTP ${res.status}`,
    });
  } catch (err: any) {
    checks.push({ name: "grace_table", ok: false, ms: Date.now() - start, detail: err.message });
  }

  // 4. Session/CSRF (try to get a session token)
  try {
    const t0 = Date.now();
    const res = await fetch(`${DRUPAL_API_URL}/session/token`, { cache: "no-store" });
    const token = await res.text();
    checks.push({
      name: "session_token",
      ok: res.ok && token.length > 10,
      ms: Date.now() - t0,
      detail: res.ok ? "CSRF token available" : `HTTP ${res.status}`,
    });
  } catch (err: any) {
    checks.push({ name: "session_token", ok: false, ms: Date.now() - start, detail: err.message });
  }

  const allOk = checks.every((c) => c.ok);
  return NextResponse.json({
    service: "drupal-sync",
    status: allOk ? "healthy" : "degraded",
    totalMs: Date.now() - start,
    checks,
  }, { status: allOk ? 200 : 503 });
}
