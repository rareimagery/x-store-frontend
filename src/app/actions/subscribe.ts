'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCreatorStoreBySlug } from '@/lib/drupal';
import { StripeProvider, XMoneyProvider } from '@/lib/payments';
import { isFreeSubscriptionAllowlisted } from '@/lib/subscription-allowlist';

type CreateSubscriptionInput = {
  creatorHandle: string;
  price: number;
  provider: 'xmoney' | 'stripe';
};

type CreateSubscriptionResult = {
  success: boolean;
  link?: string;
  error?: string;
  provider?: 'xmoney' | 'stripe';
};

type JsonApiIncludedEntry = {
  id: string;
  attributes?: {
    field_x_user_id?: string | null;
  };
};

function getProvider(provider: 'xmoney' | 'stripe') {
  return provider === 'xmoney' ? new XMoneyProvider() : new StripeProvider();
}

export async function createSubscription({
  creatorHandle,
  price,
  provider,
}: CreateSubscriptionInput): Promise<CreateSubscriptionResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: 'Sign in to subscribe.' };
  }

  const handle = creatorHandle.trim().replace(/^@+/, '');
  if (!handle) {
    return { success: false, error: 'Missing creator handle.' };
  }

  const storeData = await getCreatorStoreBySlug(handle);
  const store = storeData?.store;
  const included = Array.isArray(storeData?.included) ? storeData.included : [];
  const linkedProfileRef = store?.relationships?.field_linked_x_profile?.data;
  const linkedProfile = linkedProfileRef
    ? (included.find((entry: JsonApiIncludedEntry) => entry.id === linkedProfileRef.id) || null)
    : null;

  if (!store?.id) {
    return { success: false, error: 'Creator store not found.' };
  }

  const chosenProvider = getProvider(provider);
  if (!chosenProvider.available) {
    return {
      success: false,
      error:
        provider === 'xmoney'
          ? 'X Money subscriptions are not available yet.'
          : 'Stripe is not configured yet.',
    };
  }

  const sessionMeta = session as typeof session & {
    xId?: string | null;
    xUsername?: string | null;
  };

  const baseUrl = process.env.NEXTAUTH_URL || 'https://rareimagery.net';

  // Helpers/testers can receive free subscription access without payment checkout.
  // This only affects subscription gating, not merch/product purchase charges.
  if (
    isFreeSubscriptionAllowlisted({
      xId: sessionMeta.xId || null,
      xUsername: sessionMeta.xUsername || null,
    })
  ) {
    return {
      success: true,
      link: `${baseUrl}/stores/${handle}?subscribed=true&provider=free-helper`,
      provider,
    };
  }

  try {
    const intent = await chosenProvider.createSubscription({
      tierId: `${handle}-${provider}-subscription`,
      tierName: provider === 'xmoney' ? 'X Money Subscription' : 'Card Subscription',
      amount: price,
      currency: 'USD',
      interval: 'month',
      storeId: store.id,
      buyerXId: sessionMeta.xId || null,
      sellerXId: linkedProfile?.attributes?.field_x_user_id ?? null,
      successUrl: `${baseUrl}/stores/${handle}?subscribed=true`,
      cancelUrl: `${baseUrl}/stores/${handle}`,
    });

    if (!intent.checkoutUrl) {
      return { success: false, error: 'No checkout link was returned.' };
    }

    return {
      success: true,
      link: intent.checkoutUrl,
      provider: intent.provider === 'free' ? provider : intent.provider,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Subscription checkout failed.',
    };
  }
}