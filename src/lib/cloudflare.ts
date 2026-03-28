const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';
const CLOUDFLARE_GRAPHQL_ENDPOINT = `${CLOUDFLARE_API_BASE}/graphql`;

type CloudflareEnvelope<T> = {
  success?: boolean;
  result?: T;
  errors?: Array<{ message?: string }>;
};

type CloudflareDnsRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
};

type GraphqlZoneTrafficResponse = {
  data?: {
    viewer?: {
      zones?: Array<{
        httpRequestsAdaptiveGroups?: Array<{
          count?: number;
          sum?: {
            visits?: number;
            edgeResponseBytes?: number;
          };
        }>;
      }>;
    };
  };
  errors?: Array<{ message?: string }>;
};

export type CloudflareTrafficMetrics = {
  hostname: string;
  from: string;
  to: string;
  requests: number;
  visits: number;
  edgeResponseBytes: number;
};

type UpsertDnsRecordInput = {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT';
  name: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
};

export type StoreDnsResult = {
  configured: boolean;
  hostname: string;
  target: string | null;
  record?: CloudflareDnsRecord;
};

function getCloudflareConfig() {
  return {
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  };
}

function requireCloudflareConfig() {
  const config = getCloudflareConfig();
  if (!config.apiToken || !config.zoneId) {
    throw new Error('Cloudflare API token and zone ID must be configured');
  }
  return config;
}

export function hasCloudflareApiAccess(): boolean {
  const config = getCloudflareConfig();
  return Boolean(config.apiToken && config.zoneId);
}

async function cloudflareApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiToken } = requireCloudflareConfig();
  const res = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  const json = (await res.json()) as CloudflareEnvelope<T>;
  if (!res.ok || !json.success || !json.result) {
    const message = json.errors?.map((error) => error.message).filter(Boolean).join('; ') || 'Cloudflare API request failed';
    throw new Error(message);
  }

  return json.result;
}

export async function listZoneDnsRecords(params?: { type?: string; name?: string }): Promise<CloudflareDnsRecord[]> {
  const { zoneId } = requireCloudflareConfig();
  const search = new URLSearchParams();
  if (params?.type) {
    search.set('type', params.type);
  }
  if (params?.name) {
    search.set('name', params.name);
  }
  const query = search.toString();
  const path = `/zones/${zoneId}/dns_records${query ? `?${query}` : ''}`;
  return cloudflareApiRequest<CloudflareDnsRecord[]>(path);
}

export async function upsertZoneDnsRecord(input: UpsertDnsRecordInput): Promise<CloudflareDnsRecord> {
  const { zoneId } = requireCloudflareConfig();
  const existing = await listZoneDnsRecords({ type: input.type, name: input.name });
  const body = JSON.stringify({
    type: input.type,
    name: input.name,
    content: input.content,
    proxied: input.proxied,
    ttl: input.ttl,
  });

  if (existing[0]) {
    return cloudflareApiRequest<CloudflareDnsRecord>(`/zones/${zoneId}/dns_records/${existing[0].id}`, {
      method: 'PATCH',
      body,
    });
  }

  return cloudflareApiRequest<CloudflareDnsRecord>(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body,
  });
}

export async function getZoneTrafficMetrics(options?: { hostname?: string; days?: number }): Promise<CloudflareTrafficMetrics> {
  const { apiToken, zoneId } = requireCloudflareConfig();
  const days = Math.max(1, Math.min(options?.days || 30, 30));
  const to = new Date().toISOString();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const hostFilter = options?.hostname ? `, clientRequestHTTPHost: \"${options.hostname}\"` : '';
  const query = `query ZoneTraffic { viewer { zones(filter: { zoneTag: \"${zoneId}\" }) { httpRequestsAdaptiveGroups(limit: 1, filter: { datetime_geq: \"${from}\", datetime_lt: \"${to}\", requestSource: \"eyeball\"${hostFilter} }) { count sum { visits edgeResponseBytes } } } } }`;

  const res = await fetch(CLOUDFLARE_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
    cache: 'no-store',
  });

  const json = (await res.json()) as GraphqlZoneTrafficResponse;
  if (!res.ok || json.errors?.length) {
    const message = json.errors?.map((error) => error.message).filter(Boolean).join('; ') || 'Cloudflare GraphQL request failed';
    throw new Error(message);
  }

  const group = json.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups?.[0];

  return {
    hostname: options?.hostname || '',
    from,
    to,
    requests: group?.count || 0,
    visits: group?.sum?.visits || 0,
    edgeResponseBytes: group?.sum?.edgeResponseBytes || 0,
  };
}

export function getCloudflareAccountId(): string | undefined {
  return getCloudflareConfig().accountId;
}

function getStoreDnsTarget(): string | undefined {
  return process.env.CLOUDFLARE_STORE_CNAME_TARGET?.trim();
}

function shouldManageDnsViaCloudflare(): boolean {
  return process.env.CLOUDFLARE_MANAGE_DNS === 'true';
}

function getBaseDomain(): string {
  return process.env.NEXT_PUBLIC_BASE_DOMAIN?.trim() || 'rareimagery.net';
}

export function getStoreSubdomainHostname(slug: string): string {
  return `${slug}.${getBaseDomain()}`;
}

export function isCloudflareDnsAutomationConfigured(): boolean {
  return shouldManageDnsViaCloudflare() && hasCloudflareApiAccess() && Boolean(getStoreDnsTarget());
}

export async function ensureStoreSubdomainDns(slug: string): Promise<StoreDnsResult> {
  const hostname = getStoreSubdomainHostname(slug);
  const target = getStoreDnsTarget() || null;

  if (!shouldManageDnsViaCloudflare() || !target || !hasCloudflareApiAccess()) {
    return {
      configured: false,
      hostname,
      target,
    };
  }

  const record = await upsertZoneDnsRecord({
    type: 'CNAME',
    name: slug,
    content: target,
    proxied: true,
  });

  return {
    configured: true,
    hostname,
    target,
    record,
  };
}