import { NextResponse } from 'next/server';
import { getZoneTrafficMetrics, hasCloudflareApiAccess } from '@/lib/cloudflare';

function normalizeHandle(handle: string | null): string {
  return (handle || '').trim().replace(/^@+/, '');
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const handle = normalizeHandle(searchParams.get('handle'));
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'rareimagery.net';
  const hostname = handle ? `${handle}.${baseDomain}` : baseDomain;

  let trafficBytes = 0;
  let visits = 0;
  let source: 'cloudflare' | 'fallback' = 'fallback';

  if (hasCloudflareApiAccess()) {
    try {
      const metrics = await getZoneTrafficMetrics({ hostname, days: 30 });
      trafficBytes = metrics.edgeResponseBytes;
      visits = metrics.visits;
      source = 'cloudflare';
    } catch (error) {
      console.warn(
        `[cost] Cloudflare analytics unavailable for ${hostname}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const linkedVideoStorageCost = 0;
  const trafficGb = trafficBytes / (1024 * 1024 * 1024);
  const trafficCost = trafficGb * 0.08;
  const infraCost = 0.37;
  const monthlyCost = linkedVideoStorageCost + trafficCost + infraCost;

  const alert =
    monthlyCost > 4.5 ? 'Approaching $5 - optimize videos?' : 'Under $1 this month';

  return NextResponse.json({
    estimatedMonthly: Number(monthlyCost.toFixed(2)),
    breakdown: {
      externalVideoLinks: linkedVideoStorageCost.toFixed(2),
      traffic: trafficCost.toFixed(2),
      infra: infraCost.toFixed(2),
    },
    alert,
    bytesServed: trafficBytes,
    visits,
    hostname,
    source,
    handle: handle || null,
  });
}