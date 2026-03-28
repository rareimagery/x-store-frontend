'use server';

import { revalidatePath } from 'next/cache';

type PaymentProvider = 'stripe' | 'xmoney';

export async function createPaymentIntent(
  orderData: { productId: string; price: number; sellerHandle: string },
  provider: PaymentProvider = 'xmoney'
) {
  // Mock today - replace with real X Money API call April 2026
  if (provider === 'xmoney') {
    // Real flow coming: POST to merchants.xmoney.com/orders with siteId + privateKey
    const mockPaymentLink = `https://xmoney.com/pay/${orderData.productId}?amount=${orderData.price}&recipient=@${orderData.sellerHandle}`;

    // In April:
    // const res = await fetch('https://api.xmoney.com/orders', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${process.env.XMONEY_PRIVATE_KEY}` },
    //   body: JSON.stringify({ ... })
    // });

    return {
      success: true,
      paymentLink: mockPaymentLink,
      provider: 'X Money',
      message: 'Buyer will pay directly into your X wallet',
    };
  }

  revalidatePath(`/shop/${orderData.sellerHandle}`);
  return { success: false };
}
