'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createSubscription } from '@/app/actions/subscribe';

export default function SubscribeButton({ creatorHandle }: { creatorHandle: string }) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (provider: 'xmoney' | 'stripe') => {
    setLoading(true);
    try {
      const result = await createSubscription({ creatorHandle, price: provider === 'xmoney' ? 4 : 5, provider });
      if (result.success && result.link) {
        window.location.href = result.link;
        return;
      }
      alert(result.error || 'Unable to start subscription checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-center">
      <div className="mb-2 text-xs text-gray-400">Third-party site • Powered by X Money (not affiliated with X Corp)</div>

      <Button
        onClick={() => handleSubscribe('xmoney')}
        className="w-full bg-[#1DA1F2] py-8 text-xl font-bold text-black hover:bg-[#1A8CD8]"
        disabled={loading}
      >
        💙 Subscribe for $4/month with X Money
      </Button>

      <Button
        onClick={() => handleSubscribe('stripe')}
        variant="outline"
        className="w-full py-6 text-lg"
        disabled={loading}
      >
        Or $5/month with card
      </Button>

      <p className="text-xs text-gray-400">
        Unlocks exclusive Grok videos, early drops & private content on rareimagery.net
      </p>

      <footer className="py-4 text-center text-[10px] text-gray-500">
        rareimagery.net is an independent platform. Sign in with X is used with permission.
        All payments processed via official X Money API. Not affiliated with X Corp.
      </footer>
    </div>
  );
}