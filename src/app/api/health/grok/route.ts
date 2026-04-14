import { NextResponse } from "next/server";

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

/**
 * GET /api/health/grok
 * Validates Grok Imagine API connectivity.
 * Does NOT generate an image (costs $0.07). Just checks auth + model availability.
 */
export async function GET() {
  const start = Date.now();
  const checks: { name: string; ok: boolean; ms: number; detail?: string }[] = [];

  // 1. API key configured
  checks.push({
    name: "api_key",
    ok: !!GROK_API_KEY && GROK_API_KEY.length > 10,
    ms: 0,
    detail: GROK_API_KEY ? `Configured (${GROK_API_KEY.slice(0, 12)}...)` : "Missing GROK_API_KEY / XAI_API_KEY",
  });

  // 2. API reachability — call /v1/models to check auth without generating an image
  if (GROK_API_KEY) {
    try {
      const t0 = Date.now();
      const res = await fetch("https://api.x.ai/v1/models", {
        headers: { Authorization: `Bearer ${GROK_API_KEY}` },
        cache: "no-store",
      });
      const data = await res.json();
      const models = data.data || [];
      const hasImagine = models.some((m: any) => m.id?.includes("imagine") || m.id?.includes("image"));

      checks.push({
        name: "api_auth",
        ok: res.ok,
        ms: Date.now() - t0,
        detail: res.ok
          ? `Authenticated, ${models.length} models available`
          : `HTTP ${res.status}: ${data.error?.message || "Auth failed"}`,
      });

      checks.push({
        name: "imagine_model",
        ok: hasImagine,
        ms: 0,
        detail: hasImagine
          ? `grok-imagine model found`
          : `No imagine model in model list (${models.map((m: any) => m.id).join(", ")})`,
      });
    } catch (err: any) {
      checks.push({ name: "api_auth", ok: false, ms: Date.now() - start, detail: err.message });
    }
  } else {
    checks.push({ name: "api_auth", ok: false, ms: 0, detail: "Skipped — no API key" });
  }

  // 3. Generation counting (check field exists)
  try {
    const { DRUPAL_API_URL, drupalAuthHeaders } = await import("@/lib/drupal");
    const t0 = Date.now();
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?page[limit]=1&fields[commerce_store--online]=field_total_grok_generations`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    checks.push({
      name: "gen_count_field",
      ok: res.ok,
      ms: Date.now() - t0,
      detail: res.ok ? "field_total_grok_generations accessible" : `HTTP ${res.status}`,
    });
  } catch (err: any) {
    checks.push({ name: "gen_count_field", ok: false, ms: 0, detail: err.message });
  }

  const allOk = checks.every((c) => c.ok);
  return NextResponse.json({
    service: "grok-imagine",
    status: allOk ? "healthy" : "degraded",
    totalMs: Date.now() - start,
    checks,
  }, { status: allOk ? 200 : 503 });
}
