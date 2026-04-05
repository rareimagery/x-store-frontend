'use client';

import { useEffect, useState } from 'react';

interface CostBreakdown {
  external_video_links: number;
  cloudflare_traffic: number;
  infra_share: number;
}

interface CostData {
  total_cost: number;
  budget_threshold: number;
  under_budget: boolean;
  cloudflare_configured: boolean;
  breakdown: CostBreakdown;
  bandwidth_gb: number;
  period: { start: string; end: string };
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CostDashboard() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCosts = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_DRUPAL_BASE_URL}/api/cost-summary`,
          { credentials: 'include', headers: { 'Content-Type': 'application/json' } }
        );
        if (res.status === 403) { setError('forbidden'); return; }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchCosts();
  }, []);

  if (error === 'forbidden') return null;

  if (loading) return (
    <div className="bg-[#111] rounded-2xl p-8 animate-pulse">
      <div className="h-4 w-64 bg-white/10 rounded mb-4" />
      <div className="h-16 w-40 bg-white/10 rounded mb-3" />
      <div className="h-4 w-48 bg-white/10 rounded" />
    </div>
  );

  if (error || !data) return (
    <div className="bg-[#111] border border-red-900 rounded-2xl p-8">
      <p className="text-red-400 text-sm">Cost dashboard unavailable: {error}</p>
    </div>
  );

  return (
    <div className="bg-[#111] rounded-2xl p-8 relative overflow-hidden"
      style={{ border: '1px solid rgba(123, 45, 142, 0.3)' }}>
      <span className="absolute top-6 right-6 text-5xl select-none" role="img" aria-label="money bag">💰</span>
      <p className="text-gray-400 text-sm mb-1">Your rareimagery.net cost this month</p>
      <p className="text-white font-bold text-7xl leading-none tracking-tight">${fmt(data.total_cost)}</p>
      <p className="text-base mt-2 font-medium" style={{ color: data.under_budget ? '#4ade80' : '#f59e0b' }}>
        {data.under_budget ? `Under $${fmt(data.budget_threshold)} this month` : 'Over budget — review now'}
      </p>
      <p className="text-gray-500 text-xs mt-6 leading-relaxed">
        Breakdown: External video links ${fmt(data.breakdown.external_video_links)}
        &nbsp;•&nbsp;Traffic ${fmt(data.breakdown.cloudflare_traffic)}
        &nbsp;•&nbsp;Infra share ${fmt(data.breakdown.infra_share)}
      </p>
      {!data.cloudflare_configured && (
        <p className="text-gray-600 text-xs mt-1">
          Traffic estimate is using the fallback model until Cloudflare API access is configured
        </p>
      )}
      <p className="text-gray-700 text-xs mt-1">
        {data.period.start} – {data.period.end}
        {data.bandwidth_gb > 0 && ` · ${data.bandwidth_gb} GB transferred`}
      </p>
    </div>
  );
}
