'use server';

import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateTemplate } from '@/app/actions/template';
import type { TemplateId } from '@/templates/catalog';

type OnboardingProfile = {
  handle: string;
  name: string;
  bio: string;
  verified: boolean;
};

export async function createCreatorSite(
  profile: OnboardingProfile,
  selectedTemplate: TemplateId,
  customSlug?: string
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const sessionMeta = session as typeof session & {
    xUsername?: string | null;
    xId?: string | null;
  };

  if (!sessionMeta.xUsername || !sessionMeta.xId) {
    throw new Error('Store creation requires X authentication. Sign in with X to continue.');
  }

  const handle = profile.handle.trim().replace(/^@/, '').toLowerCase();
  if (!handle) {
    throw new Error('X handle is required');
  }

  if (handle !== String(sessionMeta.xUsername).toLowerCase()) {
    throw new Error('Profile handle must match your authenticated X account.');
  }

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://rareimagery.net';

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  const res = await fetch(`${baseUrl}/api/stores/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: JSON.stringify({
      storeName: profile.name?.trim() ? `${profile.name.trim()}'s Store` : `${handle}'s Store`,
      slug: customSlug?.trim().toLowerCase() || handle,
      ownerEmail: session.user?.email || `${handle}@rareimagery.net`,
      currency: 'USD',
      agreedToTerms: true,
      xUsername: handle,
      bioDescription: profile.bio?.trim() || '',
      followerCount: null,
      topPosts: '',
      topFollowers: '',
      metrics: '',
    }),
    cache: 'no-store',
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Store creation failed');
  }

  await updateTemplate(handle, selectedTemplate);

  return {
    success: true,
    url: payload.url || `https://${customSlug || handle}.rareimagery.net`,
    slug: payload.slug || customSlug || handle,
    partial: payload.partial || false,
    warning: payload.warning || null,
  };
}
