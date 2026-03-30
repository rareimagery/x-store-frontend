'use server';

import { revalidatePath } from 'next/cache';
import { DRUPAL_API_URL, drupalWriteHeaders } from '@/lib/drupal';

type SaveVideoLinkResult = {
  success: boolean;
  videoUrl: string;
  fieldName: string;
};

const VIDEO_URL_FIELD_CANDIDATES = [
  process.env.DRUPAL_PROFILE_VIDEO_URL_FIELD,
  'field_profile_video_url',
  'field_intro_video_url',
  'field_featured_video_url',
].filter((value): value is string => Boolean(value));

async function findCreatorProfileUuidByHandle(handle: string): Promise<string | null> {
  const params = new URLSearchParams({
    'filter[field_x_username]': handle,
    'fields[node--x_user_profile]': 'drupal_internal__nid',
  });

  const url = `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.api+json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    return null;
  }

  const json = (await res.json()) as { data?: Array<{ id?: string }> };
  return json.data?.[0]?.id ?? null;
}

function validateVideoUrl(videoUrl: string): string {
  const trimmed = videoUrl.trim();
  if (!trimmed) {
    throw new Error('Missing video URL');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Enter a valid public video URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Video URL must start with http or https');
  }

  return parsed.toString();
}

export async function saveLinkedVideo(videoUrl: string, sellerHandle: string): Promise<SaveVideoLinkResult> {
  if (!sellerHandle?.trim()) {
    throw new Error('Missing seller handle');
  }

  const normalizedUrl = validateVideoUrl(videoUrl);
  const profileUuid = await findCreatorProfileUuidByHandle(sellerHandle.trim());
  if (!profileUuid) {
    throw new Error('Creator profile not found');
  }

  const writeHeaders = await drupalWriteHeaders();

  for (const fieldName of VIDEO_URL_FIELD_CANDIDATES) {
    const res = await fetch(`${DRUPAL_API_URL}/jsonapi/node/x_user_profile/${profileUuid}`, {
      method: 'PATCH',
      headers: {
        ...writeHeaders,
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'node--x_user_profile',
          id: profileUuid,
          attributes: {
            [fieldName]: normalizedUrl,
          },
        },
      }),
      cache: 'no-store',
    });

    if (res.ok) {
      revalidatePath('/console');
      revalidatePath(`/profile/${sellerHandle}`);
      revalidatePath(`/shop/${sellerHandle}`);
      return { success: true, videoUrl: normalizedUrl, fieldName };
    }
  }

  throw new Error(
    'Video link save failed. Configure DRUPAL_PROFILE_VIDEO_URL_FIELD to the machine name of your external video URL field.'
  );
}