'use server';

import { DRUPAL_API_URL } from '@/lib/drupal';

export async function fetchDrupalDataForCreator(handle: string) {
  const normalizedHandle = handle.replace(/^@+/, '').trim();
  const token = process.env.DRUPAL_TOKEN;

  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/user/user/${encodeURIComponent(normalizedHandle)}?include=field_videos,field_products,field_subscribers`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch Drupal context (${res.status})`);
  }

  return await res.json();
}
