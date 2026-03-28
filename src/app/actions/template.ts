'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DRUPAL_API_URL, drupalWriteHeaders } from '@/lib/drupal';
import { TEMPLATE_TO_THEME, type TemplateId } from '@/templates/catalog';

async function findCreatorProfileUuidByHandle(handle: string): Promise<string | null> {
  const candidates = Array.from(new Set([handle, handle.toLowerCase()].filter(Boolean)));

  for (const candidate of candidates) {
    const params = new URLSearchParams({
      'filter[field_x_username]': candidate,
      'fields[node--creator_x_profile]': 'drupal_internal__nid',
    });

    const url = `${DRUPAL_API_URL}/jsonapi/node/creator_x_profile?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.api+json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      continue;
    }

    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    const id = json.data?.[0]?.id ?? null;
    if (id) return id;
  }

  return null;
}

export async function updateTemplate(sellerHandle: string, templateId: TemplateId) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return { success: false, error: 'Please sign in again.' };
    }

    const sessionMeta = session as typeof session & {
      role?: string;
      xUsername?: string;
      storeSlug?: string;
    };

    const role = sessionMeta.role;
    const sessionHandle = sessionMeta.xUsername || sessionMeta.storeSlug || null;

    if (role !== 'admin' && sessionHandle !== sellerHandle) {
      return { success: false, error: 'You are not allowed to update this store.' };
    }

    const profileUuid = await findCreatorProfileUuidByHandle(sellerHandle);
    if (!profileUuid) {
      return { success: false, error: 'Creator profile not found.' };
    }

    const theme = TEMPLATE_TO_THEME[templateId];
    const writeHeaders = await drupalWriteHeaders();

    const endpoint = `${DRUPAL_API_URL}/jsonapi/node/creator_x_profile/${profileUuid}`;
    const commonHeaders = {
      ...writeHeaders,
      'Content-Type': 'application/vnd.api+json',
    };
    const configPayload = JSON.stringify({
      templateId,
      selectedAt: new Date().toISOString(),
    });

    const primaryRes = await fetch(endpoint, {
      method: 'PATCH',
      headers: commonHeaders,
      body: JSON.stringify({
        data: {
          type: 'node--creator_x_profile',
          id: profileUuid,
          attributes: {
            field_store_theme: theme,
            field_store_theme_config: configPayload,
          },
        },
      }),
      cache: 'no-store',
    });

    let finalRes = primaryRes;
    if (!primaryRes.ok) {
      // Fallback for environments where field_store_theme_config is not provisioned.
      finalRes = await fetch(endpoint, {
        method: 'PATCH',
        headers: commonHeaders,
        body: JSON.stringify({
          data: {
            type: 'node--creator_x_profile',
            id: profileUuid,
            attributes: {
              field_store_theme: theme,
            },
          },
        }),
        cache: 'no-store',
      });
    }

    if (!finalRes.ok) {
      const text = await finalRes.text();
      console.error('[template] update failed:', finalRes.status, text.slice(0, 300));
      return { success: false, error: 'Could not save theme in Drupal. Please try again.' };
    }

    revalidatePath('/console');
    revalidatePath('/console/builder');
    revalidatePath(`/stores/${sellerHandle}`);
    revalidatePath(`/shop/${sellerHandle}`);

    return { success: true, theme };
  } catch (error) {
    console.error('[template] unexpected update error:', error);
    return {
      success: false,
      error: 'Theme creation failed. Please refresh and try again.',
    };
  }
}
