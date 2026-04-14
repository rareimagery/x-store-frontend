import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * GET /api/health
 * Combined health dashboard — runs all 4 service checks in parallel.
 * Admin-only for full details, public gets summary only.
 */
export async function GET(req: NextRequest) {
  const start = Date.now();
  const token = await getToken({ req });
  const isAdmin = (token?.role as string) === "admin";

  const baseUrl = req.nextUrl.origin;

  // Run all health checks in parallel
  const [drupal, x, grok, storefront] = await Promise.all([
    fetchHealth(`${baseUrl}/api/health/drupal-sync`),
    fetchHealth(`${baseUrl}/api/health/x`),
    fetchHealth(`${baseUrl}/api/health/grok`),
    fetchHealth(`${baseUrl}/api/health/storefront`),
  ]);

  const services = [drupal, x, grok, storefront];
  const allHealthy = services.every((s) => s.status === "healthy");
  const timestamp = new Date().toISOString();

  if (isAdmin) {
    return NextResponse.json({
      platform: "rareimagery",
      status: allHealthy ? "healthy" : "degraded",
      timestamp,
      totalMs: Date.now() - start,
      services,
    });
  }

  // Public: summary only
  return NextResponse.json({
    platform: "rareimagery",
    status: allHealthy ? "healthy" : "degraded",
    timestamp,
    services: services.map((s) => ({
      service: s.service,
      status: s.status,
    })),
  });
}

async function fetchHealth(url: string): Promise<any> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return await res.json();
  } catch (err: any) {
    return { service: url.split("/").pop(), status: "error", detail: err.message };
  }
}
