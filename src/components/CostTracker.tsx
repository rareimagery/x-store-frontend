'use client';

import { useEffect, useState } from 'react';

type CostResponse = {
  estimatedMonthly?: number;
  breakdown?: {
    externalVideoLinks?: string;
    traffic?: string;
    infra?: string;
  };
  alert?: string;
  source?: 'cloudflare' | 'fallback';
};

export default function CostTracker({ sellerHandle }: { sellerHandle: string }) {
  const [cost, setCost] = useState(0.68);
  const [alert, setAlert] = useState('Under $1 this month');
  const [breakdown, setBreakdown] = useState({
    externalVideoLinks: '0.00',
    traffic: '0.00',
    infra: '0.37',
  });
  const [source, setSource] = useState<'cloudflare' | 'fallback'>('fallback');

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/cost?handle=${sellerHandle}`)
      .then((r) => r.json())
      .then((data: CostResponse) => {
        if (!cancelled) {
          setCost(data.estimatedMonthly || 0.68);
          setAlert(data.alert || 'Under $1 this month');
          setBreakdown({
            externalVideoLinks: data.breakdown?.externalVideoLinks || '0.00',
            traffic: data.breakdown?.traffic || '0.00',
            infra: data.breakdown?.infra || '0.37',
          });
          setSource(data.source || 'fallback');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCost(0.68);
          setAlert('Under $1 this month');
          setSource('fallback');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sellerHandle]);

  return (
    <div className="rounded-xl border border-[#1DA1F2] bg-zinc-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Your rareimagery.net cost this month</p>
          <p className="text-4xl font-bold text-white">${cost.toFixed(2)}</p>
          <p className="text-xs text-green-400">{alert}</p>
        </div>
        <div className="text-6xl">💰</div>
      </div>
      <div className="mt-6 text-xs text-gray-500">
        Breakdown: External video links ${breakdown.externalVideoLinks} • Traffic ${breakdown.traffic} • Infra share ${breakdown.infra}
        <br />
        {source === 'cloudflare'
          ? 'Traffic estimate is based on live Cloudflare zone analytics for the last 30 days'
          : 'Traffic estimate is using the fallback model until Cloudflare API access is configured'}
      </div>
    </div>
  );
}
