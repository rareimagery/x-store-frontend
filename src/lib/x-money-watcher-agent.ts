// ---------------------------------------------------------------------------
// X Money Watcher Agent
// Polls X API payment endpoints every 6 hours.
// The moment any payment endpoint stops returning 404, X Money is LIVE —
// fires a critical alert so XMONEY_API_KEY can be set immediately.
// ---------------------------------------------------------------------------

import { sendEmail } from "@/lib/notifications";

const ADMIN_EMAIL = process.env.CONSOLE_ADMIN_EMAIL || "admin@rareimagery.net";

// Candidate endpoints to probe — any non-404 means the API is live
const XMONEY_PROBE_ENDPOINTS = [
  { url: "https://api.x.com/2/payments", label: "Payments root" },
  { url: "https://api.x.com/2/payments/intents", label: "Payment intents" },
  { url: "https://api.x.com/2/payments/charges", label: "Payment charges" },
  { url: "https://api.x.com/2/payments/transfers", label: "Payment transfers" },
];

export interface XMoneyProbeResult {
  label: string;
  url: string;
  status: number | null;
  live: boolean; // true if NOT a 404 (API route exists)
  latencyMs: number;
  error?: string;
}

export interface XMoneyWatcherReport {
  timestamp: string;
  durationMs: number;
  xApiKeyConfigured: boolean;
  xMoneyKeyConfigured: boolean;
  probes: XMoneyProbeResult[];
  xMoneyLive: boolean; // true the moment any probe returns non-404
  issues: string[];
  status: "waiting" | "detected" | "active";
}

async function probeEndpoint(
  url: string,
  label: string,
  bearerToken?: string
): Promise<XMoneyProbeResult> {
  const start = Date.now();
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (bearerToken) {
      headers["Authorization"] = `Bearer ${bearerToken}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    // 404 = API doesn't exist yet. Anything else = endpoint exists.
    const live = res.status !== 404;
    return {
      label,
      url,
      status: res.status,
      live,
      latencyMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    return {
      label,
      url,
      status: null,
      live: false,
      latencyMs: Date.now() - start,
      error: message,
    };
  }
}

export async function runXMoneyWatcherAgent(): Promise<XMoneyWatcherReport> {
  const startTime = Date.now();
  const issues: string[] = [];

  const bearerToken = process.env.X_API_BEARER_TOKEN;
  const xMoneyKey = process.env.XMONEY_API_KEY;

  const xApiKeyConfigured = !!bearerToken;
  const xMoneyKeyConfigured = !!xMoneyKey;

  // Run all probes in parallel
  const probes = await Promise.all(
    XMONEY_PROBE_ENDPOINTS.map((ep) =>
      probeEndpoint(ep.url, ep.label, bearerToken)
    )
  );

  const anyLive = probes.some((p) => p.live);
  const liveProbes = probes.filter((p) => p.live);

  let status: XMoneyWatcherReport["status"] = "waiting";

  if (xMoneyKeyConfigured) {
    // Key is already set — X Money is fully active
    status = "active";
  } else if (anyLive) {
    // API is live but key not yet set — urgent!
    status = "detected";
    issues.push(
      `ALERT: X Money API endpoints are LIVE on ${liveProbes.map((p) => p.label).join(", ")} but XMONEY_API_KEY is not configured.`
    );
    issues.push(
      "ACTION REQUIRED: Add XMONEY_API_KEY to .env.production on the server and restart immediately."
    );

    // Fire urgent email alert
    try {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: "🚨 X Money API is LIVE — Set XMONEY_API_KEY NOW",
        html: `
          <h2 style="color:#e11d48;">X Money API is Now Live</h2>
          <p>The X Money API endpoints are responding (non-404) as of <strong>${new Date().toUTCString()}</strong>.</p>

          <h3>Live Endpoints Detected:</h3>
          <ul>
            ${liveProbes.map((p) => `<li><strong>${p.label}</strong> — <code>${p.url}</code> → HTTP ${p.status}</li>`).join("")}
          </ul>

          <h3>Action Required:</h3>
          <ol>
            <li>Get your X Money API key from <a href="https://developer.x.com/en/portal/dashboard">developer.x.com</a></li>
            <li>Add <code>XMONEY_API_KEY</code> to .env.production on the server</li>
            <li>Restart: <code>pm2 restart rareimagery</code></li>
          </ol>

          <p>Once <code>XMONEY_API_KEY</code> is set, <code>XMoneyProvider.available</code> returns <code>true</code> and the payment system automatically switches from Stripe to X Money.</p>

          <p style="color:#6b7280;font-size:12px;">Sent by RareImagery X Money Watcher Agent · ${new Date().toUTCString()}</p>
        `,
      });
    } catch (emailErr) {
      console.error("[x-money-watcher] Failed to send alert email:", emailErr);
    }
  }

  return {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    xApiKeyConfigured,
    xMoneyKeyConfigured,
    probes,
    xMoneyLive: anyLive || xMoneyKeyConfigured,
    issues,
    status,
  };
}
