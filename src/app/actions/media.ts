'use server';

import { revalidatePath } from 'next/cache';
import { DRUPAL_API_URL, drupalWriteHeaders } from '@/lib/drupal';

type UploadResult = {
  success: boolean;
  message?: string;
  assetId?: string;
  fieldName?: string;
};

const VIDEO_FIELD_CANDIDATES = [
  process.env.DRUPAL_PROFILE_VIDEO_FIELD,
  'field_profile_video',
  'field_intro_video',
  'field_featured_video',
].filter((v): v is string => Boolean(v));

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

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

  const json = (await res.json()) as {
    data?: Array<{ id?: string }>;
  };

  const profile = json.data?.[0];
  return profile?.id ?? null;
}

export async function uploadVideoToDrupal(file: File, sellerHandle: string): Promise<UploadResult> {
  if (!sellerHandle?.trim()) {
    return { success: false, message: 'Missing seller handle.' };
  }

  if (!file) {
    return { success: false, message: 'No video file selected.' };
  }

  const mime = file.type || 'video/mp4';
  if (!mime.startsWith('video/')) {
    return { success: false, message: 'Please upload a valid video file.' };
  }

  const profileUuid = await findCreatorProfileUuidByHandle(sellerHandle.trim());
  if (!profileUuid) {
    return { success: false, message: 'Creator profile not found in Drupal.' };
  }

  const writeHeaders = await drupalWriteHeaders();
  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = safeFilename(file.name || `${sellerHandle}-video.mp4`);

  for (const fieldName of VIDEO_FIELD_CANDIDATES) {
    const endpoint = `${DRUPAL_API_URL}/jsonapi/node/x_user_profile/${profileUuid}/${fieldName}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...writeHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `file; filename="${filename}"`,
      },
      body: bytes,
      cache: 'no-store',
    });

    if (res.ok) {
      const payload = (await res.json()) as { data?: { id?: string } };
      revalidatePath('/console');
      revalidatePath(`/stores/${sellerHandle}`);
      revalidatePath(`/shop/${sellerHandle}`);
      return {
        success: true,
        message: 'Video hosted on rareimagery.net and now live in your profile.',
        assetId: payload.data?.id,
        fieldName,
      };
    }
  }

  return {
    success: false,
    message:
      'Upload failed. Configure DRUPAL_PROFILE_VIDEO_FIELD to your creator profile video field machine name.',
  };
}
