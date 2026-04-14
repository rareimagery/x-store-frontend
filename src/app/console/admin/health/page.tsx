"use client";

import { useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";

interface ServiceCheck {
  name: string;
  ok: boolean;
  ms: number;
  detail?: string;
}

interface HealthService {
  service: string;
  status: string;
  totalMs: number;
  checks: ServiceCheck[];
}

interface DrupalHealthEntry {
  service: string;
  status: string;
  check_time: string;
  details: string;
  response_ms: number;
}

interface WatchdogAlert {
  id: number;
  alert_type: string;
  severity: string;
  entity_id: string | null;
  message: string;
  created: string;
  resolved: string | null;
}

export default function AdminHealthPage() {
  const { role } = useConsole();
  const [nextjsHealth, setNextjsHealth] = useState<HealthService[]>([]);
  const [drupalHealth, setDrupalHealth] = useState<DrupalHealthEntry[]>([]);
  const [alerts, setAlerts] = useState<WatchdogAlert[]>([]);
  const [resolvedAlerts, setResolvedAlerts] = useState<WatchdogAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  const isAdmin = role === "admin";

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [nxDrupal, nxX, nxGrok, nxStorefront, dHealth, dAlerts] = await Promise.all([
        fetch("/api/health/drupal-sync").then((r) => r.json()).catch(() => null),
        fetch("/api/health/x").then((r) => r.json()).catch(() => null),
        fetch("/api/health/grok").then((r) => r.json()).catch(() => null),
        fetch("/api/health/storefront").then((r) => r.json()).catch(() => null),
        fetch("/api/health/drupal-sync").then(() =>
          // Fetch Drupal-side health log
          fetch("/api/health/drupal-sync").then((r) => r.json()).catch(() => null)
        ),
        fetch("/api/stores/grace-visitors?creator=__watchdog__").catch(() => null),
      ]);

      const services: HealthService[] = [];
      if (nxDrupal) services.push(nxDrupal);
      if (nxX) services.push(nxX);
      if (nxGrok) services.push(nxGrok);
      if (nxStorefront) services.push(nxStorefront);
      setNextjsHealth(services);

      // Fetch Drupal health log directly
      try {
        const dRes = await fetch("/api/health/drupal-sync");
        const dData = await dRes.json();
        if (dData.checks) {
          setDrupalHealth(dData.checks.map((c: any) => ({
            service: c.name,
            status: c.ok ? "healthy" : "degraded",
            check_time: new Date().toISOString(),
            details: c.detail || "",
            response_ms: c.ms || 0,
          })));
        }
      } catch {}

      // Fetch watchdog alerts via Drupal proxy
      try {
        const alertRes = await fetch("/api/console/watchdog-alerts");
        if (alertRes.ok) {
          const alertData = await alertRes.json();
          setAlerts(alertData.active || []);
          setResolvedAlerts(alertData.recently_resolved || []);
        }
      } catch {}

      setLastRefresh(new Date().toLocaleTimeString());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
    const interval = setInterval(fetchAll, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-zinc-500">Admin access required.</p>
      </div>
    );
  }

  const allHealthy = nextjsHealth.every((s) => s.status === "healthy");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Health</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time monitoring of all services. Auto-refreshes every 60s.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${allHealthy ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
            <span className={`h-2 w-2 rounded-full ${allHealthy ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
            {allHealthy ? "All Systems Healthy" : "Degraded"}
          </div>
          <button onClick={fetchAll} disabled={loading} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition disabled:opacity-50">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          {lastRefresh && <span className="text-[10px] text-zinc-600">Last: {lastRefresh}</span>}
        </div>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {nextjsHealth.map((svc) => (
          <div key={svc.service} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white capitalize">{svc.service.replace(/-/g, " ")}</h3>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium ${svc.status === "healthy" ? "text-green-400" : "text-red-400"}`}>
                  {svc.status}
                </span>
                <span className="text-[10px] text-zinc-600">{svc.totalMs}ms</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {svc.checks?.map((check) => (
                <div key={check.name} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${check.ok ? "bg-green-400" : "bg-red-400"}`} />
                    <span className="text-xs text-zinc-300">{check.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 max-w-48 truncate text-right">{check.detail}</span>
                    {check.ms > 0 && <span className="text-[10px] text-zinc-600">{check.ms}ms</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Watchdog Alerts */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Watchdog Alerts</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${alerts.length === 0 ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
            {alerts.length === 0 ? "No active alerts" : `${alerts.length} active`}
          </span>
        </div>
        {alerts.length === 0 && resolvedAlerts.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-4">All clear — no integrity issues detected.</p>
        ) : (
          <div className="space-y-1.5">
            {alerts.map((alert) => (
              <div key={alert.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${alert.severity === "error" ? "bg-red-900/20 border border-red-800/30" : alert.severity === "critical" ? "bg-amber-900/20 border border-amber-800/30" : "bg-zinc-800/50"}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold uppercase ${alert.severity === "error" ? "text-red-400" : alert.severity === "critical" ? "text-amber-400" : "text-zinc-500"}`}>
                    {alert.severity}
                  </span>
                  <span className="text-xs text-zinc-300">{alert.message}</span>
                </div>
                <span className="text-[10px] text-zinc-600">{new Date(alert.created).toLocaleDateString()}</span>
              </div>
            ))}
            {resolvedAlerts.length > 0 && (
              <>
                <p className="text-[10px] text-zinc-600 mt-3 mb-1">Recently resolved (24h):</p>
                {resolvedAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-800/30 opacity-60">
                    <span className="text-xs text-zinc-500 line-through">{alert.message}</span>
                    <span className="text-[10px] text-green-500">Resolved</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
