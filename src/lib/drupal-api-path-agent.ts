import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import { sendEmail } from "@/lib/notifications";

export interface EndpointCheck {
  name: string;
  url: string;
  method: "GET" | "POST";
  status: number | null;
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface DrupalApiPathAgentReport {
  timestamp: string;
  durationMs: number;
  baseUrl: string;
  drupalUrl: string;
  httpsConfigOk: boolean;
  checks: EndpointCheck[];
  issues: string[];
  status: "healthy" | "degraded" | "critical";
}

const ADMIN_EMAIL = process.env.CONSOLE_ADMIN_EMAIL || "admin@rareimagery.net";

function resolveBaseUrl(): string {
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl) return nextAuthUrl.replace(/\/$/, "");

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN?.trim() || "rareimagery.net";
  return `https://${baseDomain}`;
}

async function checkEndpoint(
  name: string,
  url: string,
  method: "GET" | "POST",
  init?: RequestInit
): Promise<EndpointCheck> {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
      ...init,
    });

    return {
      name,
      url,
      method,
      status: response.status,
      ok: response.status < 500,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      name,
      url,
      method,
      status: null,
      ok: false,
      latencyMs: Date.now() - start,
      error: err?.message || "Unknown error",
    };
  }
}

export async function runDrupalApiPathAgent(): Promise<DrupalApiPathAgentReport> {
  const startTime = Date.now();
  const baseUrl = resolveBaseUrl();
  const issues: string[] = [];

  const httpsConfigOk =
    DRUPAL_API_URL.startsWith("https://") && baseUrl.startsWith("https://");

  if (!httpsConfigOk) {
    issues.push(
      `CRITICAL: Insecure configuration detected (baseUrl=${baseUrl}, drupalUrl=${DRUPAL_API_URL})`
    );
  }

  const checks: EndpointCheck[] = [];

  const drupalHealth = await checkEndpoint(
    "Drupal JSON:API root",
    `${DRUPAL_API_URL}/jsonapi`,
    "GET"
  );
  checks.push(drupalHealth);
  if (!drupalHealth.ok) {
    issues.push(
      `CRITICAL: Drupal JSON:API unreachable (${drupalHealth.status ?? "timeout"})`
    );
  }

  const drupalCreatorRead = await checkEndpoint(
    "Drupal creator profile list",
    `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?page[limit]=1`,
    "GET",
    { headers: { ...drupalAuthHeaders() } }
  );
  checks.push(drupalCreatorRead);
  if (!drupalCreatorRead.ok) {
    issues.push(
      `CRITICAL: Drupal creator profile query failed (${drupalCreatorRead.status ?? "timeout"})`
    );
  }

  const homepage = await checkEndpoint("Next.js homepage", `${baseUrl}/`, "GET");
  checks.push(homepage);
  if (!homepage.ok) {
    issues.push(`CRITICAL: Next.js homepage unavailable (${homepage.status ?? "timeout"})`);
  }

  const sessionCheck = await checkEndpoint(
    "NextAuth session API",
    `${baseUrl}/api/auth/session`,
    "GET"
  );
  checks.push(sessionCheck);
  if (!sessionCheck.ok) {
    issues.push(
      `CRITICAL: NextAuth session endpoint unhealthy (${sessionCheck.status ?? "timeout"})`
    );
  }

  const siteGenerateUnauth = await checkEndpoint(
    "Site generate unauth behavior",
    `${baseUrl}/api/site/generate`,
    "POST",
    {
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }
  );
  checks.push(siteGenerateUnauth);

  if (siteGenerateUnauth.status !== 401) {
    issues.push(
      `WARN: /api/site/generate returned ${siteGenerateUnauth.status ?? "timeout"} for unauthenticated request (expected 401)`
    );
  }

  const cronAuthGuard = await checkEndpoint(
    "Cron auth guard",
    `${baseUrl}/api/cron/api-agent`,
    "GET"
  );
  checks.push(cronAuthGuard);

  if (cronAuthGuard.status !== 401) {
    issues.push(
      `WARN: /api/cron/api-agent returned ${cronAuthGuard.status ?? "timeout"} without bearer token (expected 401)`
    );
  }

  const criticalCount = issues.filter((i) => i.startsWith("CRITICAL")).length;
  const status: DrupalApiPathAgentReport["status"] =
    criticalCount > 0 ? "critical" : issues.length > 0 ? "degraded" : "healthy";

  const report: DrupalApiPathAgentReport = {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    baseUrl,
    drupalUrl: DRUPAL_API_URL,
    httpsConfigOk,
    checks,
    issues,
    status,
  };

  if (status === "critical") {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: "[CRITICAL] Drupal/API Path Agent Failed",
      html: `<pre>${JSON.stringify(report, null, 2)}</pre>`,
      text: `Drupal/API path check failed.\n\nIssues:\n${issues.join("\n")}`,
    }).catch(() => {});
  }

  return report;
}