'use client';

import { useState } from 'react';
import { createPaymentIntent } from '@/app/actions/payment';

export default function PayWithXMoneyButton({
  productId,
  price,
  sellerHandle,
}: {
  productId: string;
  price: number;
  sellerHandle: string;
}) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const result = await createPaymentIntent(
        { productId, price, sellerHandle },
        'xmoney'
      );

      if (result.success && result.paymentLink) {
        window.location.href = result.paymentLink;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="w-full rounded-xl bg-black px-4 py-4 text-lg font-bold text-white transition hover:bg-[#1DA1F2] disabled:cursor-not-allowed disabled:opacity-70"
      type="button"
    >
      <span className="flex items-center justify-center gap-2">
        <span>Pay with X Money (instant to @{sellerHandle})</span>
        {loading && <span className="animate-pulse">-&gt;</span>}
      </span>
    </button>
  );
}
