import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getCloudflareAccountId,
  getZoneTrafficMetrics,
  hasCloudflareApiAccess,
  isCloudflareDnsAutomationConfigured,
  listZoneDnsRecords,
} from '@/lib/cloudflare';

export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionMeta = session as typeof session & { role?: string };

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (sessionMeta.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'rareimagery.net';

  if (!hasCloudflareApiAccess()) {
    return NextResponse.json({
      configured: false,
      dnsAutomationConfigured: isCloudflareDnsAutomationConfigured(),
      zoneId: process.env.CLOUDFLARE_ZONE_ID || null,
      accountId: getCloudflareAccountId() || null,
      baseDomain,
      error: 'Set CLOUDFLARE_API_TOKEN to enable Cloudflare diagnostics.',
      note: 'DNS automation is disabled unless CLOUDFLARE_MANAGE_DNS=true.',
    });
  }

  try {
    const [dnsRecords, traffic] = await Promise.all([
      listZoneDnsRecords({ name: baseDomain }),
      getZoneTrafficMetrics({ hostname: baseDomain, days: 30 }),
    ]);

    return NextResponse.json({
      configured: true,
      dnsAutomationConfigured: isCloudflareDnsAutomationConfigured(),
      zoneId: process.env.CLOUDFLARE_ZONE_ID || null,
      accountId: getCloudflareAccountId() || null,
      baseDomain,
      note: 'DNS automation is disabled unless CLOUDFLARE_MANAGE_DNS=true.',
      dnsCheck: {
        count: dnsRecords.length,
        records: dnsRecords.slice(0, 10),
      },
      analyticsCheck: traffic,
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        dnsAutomationConfigured: isCloudflareDnsAutomationConfigured(),
        zoneId: process.env.CLOUDFLARE_ZONE_ID || null,
        accountId: getCloudflareAccountId() || null,
        baseDomain,
        note: 'DNS automation is disabled unless CLOUDFLARE_MANAGE_DNS=true.',
        error: error instanceof Error ? error.message : 'Cloudflare diagnostics failed',
      },
      { status: 500 }
    );
  }
}