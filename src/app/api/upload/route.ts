import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalWriteHeaders } from "@/lib/drupal";

/**
 * POST /api/upload
 * Uploads a file to Drupal and returns its public URL.
 * Accepts multipart/form-data with a "file" field.
 * Authenticated users only.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" }, { status: 400 });
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const filename = `bg_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const writeHeaders = await drupalWriteHeaders();

    // Upload via Drupal's JSON:API file endpoint
    const uploadRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/file/file`,
      {
        method: "POST",
        headers: {
          ...writeHeaders,
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `file; filename="${filename}"`,
          Accept: "application/vnd.api+json",
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      // Fallback: try the binary file upload endpoint
      const fallbackRes = await fetch(
        `${DRUPAL_API_URL}/file/upload/node/x_user_profile/field_x_background?_format=json`,
        {
          method: "POST",
          headers: {
            ...writeHeaders,
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `file; filename="${filename}"`,
          },
          body: buffer,
        }
      );

      if (!fallbackRes.ok) {
        const text = await fallbackRes.text();
        console.error("[upload] Drupal upload failed:", fallbackRes.status, text);
        return NextResponse.json({ error: "Upload to Drupal failed" }, { status: 500 });
      }

      const fallbackData = await fallbackRes.json();
      const fileUri = fallbackData.uri?.[0]?.url || fallbackData.uri?.url;
      if (fileUri) {
        const publicUrl = fileUri.startsWith("http") ? fileUri : `${DRUPAL_API_URL}${fileUri}`;
        return NextResponse.json({ url: publicUrl });
      }

      return NextResponse.json({ error: "Could not resolve file URL" }, { status: 500 });
    }

    const uploadData = await uploadRes.json();
    const fileUrl = uploadData.data?.attributes?.uri?.url;

    if (!fileUrl) {
      return NextResponse.json({ error: "Upload succeeded but no URL returned" }, { status: 500 });
    }

    const publicUrl = fileUrl.startsWith("http") ? fileUrl : `${DRUPAL_API_URL}${fileUrl}`;
    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error("[upload] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
