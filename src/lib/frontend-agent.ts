import { revalidatePath } from "next/cache";
import { getAllCreatorProfiles, getStoreProducts, DRUPAL_API_URL } from "@/lib/drupal";
import { sendEmail } from "@/lib/notifications";
import type { CreatorProfile } from "@/lib/drupal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoreCheck {
  username: string;
  storePageStatus: number | null;
  storePageAccessible: boolean;
  drupalProductCount: number;
  storeStatus: string | null;
  revalidated: boolean;
  error?: string;
}

export interface ApiRouteCheck {
  path: string;
  status: number | null;
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface HealthReport {
  timestamp: string;
  durationMs: number;
  drupalReachable: boolean;
  drupalLatencyMs: number;
  totalProfiles: number;
  storeChecks: StoreCheck[];
  apiRouteChecks: ApiRouteCheck[];
  revalidatedPaths: string[];
  issues: string[];
  status: "healthy" | "degraded" | "critical";
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE = process.env.NEXTAUTH_URL || `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net"}`;
const ADMIN_EMAIL =
  process.env.CONSOLE_ADMIN_EMAIL || "admin@rareimagery.net";
const BATCH_SIZE = 5;

const CRITICAL_API_ROUTES = [
  "/api/social/picks",
];

// ---------------------------------------------------------------------------
// Check helpers
// ---------------------------------------------------------------------------

async function checkDrupalReachability(): Promise<{
  reachable: boolean;
  latencyMs: number;
}> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`${DRUPAL_API_URL}/jsonapi`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    return { reachable: res.ok || res.status === 200, latencyMs: Date.now() - start };
  } catch {
    return { reachable: false, latencyMs: Date.now() - start };
  }
}

async function checkStorePage(username: string): Promise<{
  status: number | null;
  accessible: boolean;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(`${BASE}/stores/${username}`, {
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return {
      status: res.status,
      accessible: res.status >= 200 && res.status < 400,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Request failed";
    return { status: null, accessible: false, error: message };
  }
}

async function checkStoreProducts(
  profile: CreatorProfile
): Promise<number> {
  if (!profile.linked_store_id) return 0;
  try {
    const products = await getStoreProducts(profile.linked_store_id);
    return products.length;
  } catch {
    return -1; // indicates fetch failure
  }
}

async function checkApiRoute(path: string): Promise<ApiRouteCheck> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`${BASE}${path}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return {
      path,
      status: res.status,
      ok: res.status < 500,
      latencyMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Request failed";
    return {
      path,
      status: null,
      ok: false,
      latencyMs: Date.now() - start,
      error: message,
    };
  }
}

// ---------------------------------------------------------------------------
// Batch helper
// ---------------------------------------------------------------------------

async function processBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize: number
): Promise<Array<R | undefined>> {
  const results: Array<R | undefined> = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(fn));
    for (const r of batchResults) {
      results.push(r.status === "fulfilled" ? r.value : undefined);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main agent
// ---------------------------------------------------------------------------

export async function runAgent(): Promise<HealthReport> {
  const startTime = Date.now();
  const issues: string[] = [];
  const revalidatedPaths: string[] = [];

  // 1. Check Drupal reachability
  const drupal = await checkDrupalReachability();
  if (!drupal.reachable) {
    issues.push("CRITICAL: Drupal API is unreachable");
    return {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      drupalReachable: false,
      drupalLatencyMs: drupal.latencyMs,
      totalProfiles: 0,
      storeChecks: [],
      apiRouteChecks: [],
      revalidatedPaths: [],
      issues,
      status: "critical",
    };
  }

  // 2. Fetch all creator profiles from Drupal
  let profiles: CreatorProfile[] = [];
  try {
    profiles = await getAllCreatorProfiles();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    issues.push(`CRITICAL: Failed to fetch creator profiles: ${message}`);
  }

  // 3. Check each store page + product counts (batched)
  const storeChecksRaw = await processBatch(
    profiles,
    async (profile): Promise<StoreCheck> => {
      const [pageResult, productCount] = await Promise.all([
        checkStorePage(profile.x_username),
        checkStoreProducts(profile),
      ]);

      const check: StoreCheck = {
        username: profile.x_username,
        storePageStatus: pageResult.status,
        storePageAccessible: pageResult.accessible,
        drupalProductCount: productCount,
        storeStatus: profile.store_status,
        revalidated: false,
        error: pageResult.error,
      };

      // Revalidate if page is inaccessible but store is approved
      if (!pageResult.accessible && profile.store_status === "approved") {
        try {
          revalidatePath(`/stores/${profile.x_username}`);
          check.revalidated = true;
          revalidatedPaths.push(`/stores/${profile.x_username}`);
        } catch {
          // revalidatePath may not work in all contexts
        }
      }

      // Record issues
      if (
        !pageResult.accessible &&
        profile.store_status === "approved"
      ) {
        issues.push(
          `Store page /stores/${profile.x_username} returned ${pageResult.status ?? "timeout"} (expected 200)`
        );
      }

      return check;
    },
    BATCH_SIZE
  );
  const storeChecks: StoreCheck[] = storeChecksRaw.filter((check): check is StoreCheck => Boolean(check));

  // 4. Check critical API routes
  const apiRouteChecks = await Promise.all(
    CRITICAL_API_ROUTES.map(checkApiRoute)
  );

  for (const check of apiRouteChecks) {
    if (!check.ok) {
      issues.push(
        `API route ${check.path} returned ${check.status ?? "timeout"}: ${check.error || "server error"}`
      );
    }
  }

  // 5. Determine overall status
  const criticalCount = issues.filter((i) => i.startsWith("CRITICAL")).length;
  const status: HealthReport["status"] =
    criticalCount > 0
      ? "critical"
      : issues.length > 0
        ? "degraded"
        : "healthy";

  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    drupalReachable: drupal.reachable,
    drupalLatencyMs: drupal.latencyMs,
    totalProfiles: profiles.length,
    storeChecks,
    apiRouteChecks,
    revalidatedPaths,
    issues,
    status,
  };

  // 6. Notify admin on critical issues
  if (status === "critical") {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[CRITICAL] Frontend Agent Health Check Failed`,
      html: `<pre>${JSON.stringify(report, null, 2)}</pre>`,
      text: `Frontend health check CRITICAL.\n\nIssues:\n${issues.join("\n")}`,
    }).catch(() => {});
  }

  return report;
}
