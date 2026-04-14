"use client";

import { useCallback, useEffect, useState } from "react";

interface GateSettings {
  gateEnabled: boolean;
  graceDays: number;
  gateMode: string;
  gateBonus: string;
}

interface Visitor {
  visitor_x_id: string;
  status: string;
  hours_remaining: number | null;
  first_visit: string;
  claimed: boolean;
  claimed_at: string | null;
  claim_method: string | null;
}

export default function XSubscribeGateSettings({ storeSlug, xUsername }: { storeSlug: string; xUsername: string }) {
  const [settings, setSettings] = useState<GateSettings>({
    gateEnabled: false,
    graceDays: 3,
    gateMode: "soft",
    gateBonus: "none",
  });
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!storeSlug) return;
    Promise.all([
      fetch("/api/stores/gate-settings").then((r) => r.json()).catch(() => null),
      fetch(`/api/stores/grace-visitors?creator=${encodeURIComponent(xUsername)}`).then((r) => r.json()).catch(() => null),
    ]).then(([gateData, visitorData]) => {
      if (gateData && !gateData.error) {
        setSettings({
          gateEnabled: gateData.gateEnabled ?? false,
          graceDays: gateData.graceDays ?? 3,
          gateMode: gateData.gateMode || "soft",
          gateBonus: gateData.gateBonus || "none",
        });
      }
      if (visitorData?.visitors) {
        setVisitors(visitorData.visitors);
      }
    }).finally(() => setLoading(false));
  }, [storeSlug, xUsername]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/stores/gate-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [settings]);

  if (loading) return null;

  const inGrace = visitors.filter((v) => v.status === "in_grace").length;
  const claimed = visitors.filter((v) => v.status === "claimed").length;
  const expired = visitors.filter((v) => v.status === "expired").length;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">X Subscribe Gate</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Prompt visitors to subscribe to your X account after a grace period
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-400">Saved!</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-zinc-300">Enable Subscribe Gate</label>
        <button
          onClick={() => setSettings((s) => ({ ...s, gateEnabled: !s.gateEnabled }))}
          className={`relative h-6 w-11 rounded-full transition ${settings.gateEnabled ? "bg-indigo-600" : "bg-zinc-700"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${settings.gateEnabled ? "translate-x-5.5 left-0.5" : "left-0.5"}`} style={{ transform: settings.gateEnabled ? "translateX(20px)" : "translateX(0)" }} />
        </button>
      </div>

      {settings.gateEnabled && (
        <>
          {/* Grace Days */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Grace Period (days)</label>
            <select
              value={settings.graceDays}
              onChange={(e) => setSettings((s) => ({ ...s, graceDays: parseInt(e.target.value) }))}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>

          {/* Gate Mode */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Gate Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSettings((s) => ({ ...s, gateMode: "soft" }))}
                className={`rounded-lg px-4 py-2 text-xs font-medium transition border ${settings.gateMode === "soft" ? "border-indigo-500 bg-indigo-900/30 text-indigo-300" : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"}`}
              >
                Soft (Banner)
              </button>
              <button
                onClick={() => setSettings((s) => ({ ...s, gateMode: "hard" }))}
                className={`rounded-lg px-4 py-2 text-xs font-medium transition border ${settings.gateMode === "hard" ? "border-indigo-500 bg-indigo-900/30 text-indigo-300" : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"}`}
              >
                Hard (Block)
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">
              {settings.gateMode === "soft" ? "Shows a banner prompting visitors to subscribe" : "Blurs content and blocks checkout until subscribed"}
            </p>
          </div>

          {/* Bonus */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Subscriber Bonus</label>
            <select
              value={settings.gateBonus}
              onChange={(e) => setSettings((s) => ({ ...s, gateBonus: e.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="none">None</option>
              <option value="credits_50">+50 AI Credits</option>
              <option value="discount_10">10% Off First Order</option>
              <option value="digital_file">Free Digital Bonus</option>
            </select>
          </div>

          {/* Visitor Activity */}
          {visitors.length > 0 && (
            <div className="pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Visitor Activity</h3>
                <div className="flex gap-3 text-[10px]">
                  <span className="text-amber-400">{inGrace} in grace</span>
                  <span className="text-green-400">{claimed} subscribed</span>
                  <span className="text-zinc-500">{expired} expired</span>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {visitors.slice(0, 20).map((v) => (
                  <div key={v.visitor_x_id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://x.com/${v.visitor_x_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        @{v.visitor_x_id}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      {v.status === "in_grace" && (
                        <span className="text-[10px] text-amber-400">
                          {v.hours_remaining != null ? `${Math.ceil(v.hours_remaining / 24)}d left` : "active"}
                        </span>
                      )}
                      {v.status === "claimed" && (
                        <span className="text-[10px] text-green-400">
                          {v.claim_method === "follow_verified" ? "Follow verified" : v.claim_method === "follow_intent" ? "Followed" : "Claimed"}
                        </span>
                      )}
                      {v.status === "expired" && (
                        <span className="text-[10px] text-zinc-500">Expired</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
