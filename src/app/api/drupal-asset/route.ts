import { DRUPAL_API_URL } from "@/lib/drupal";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path || !path.startsWith("/sites/default/files/")) {
    return Response.json(
      { error: "Invalid asset path" },
      { status: 400 }
    );
  }

  const targetUrl = `${DRUPAL_API_URL}${path}`;
  const upstream = await fetch(targetUrl, {
    cache: "force-cache",
    next: { revalidate: 60 * 60 },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: upstream.status || 404 });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const etag = upstream.headers.get("etag");
  const lastModified = upstream.headers.get("last-modified");

  headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  if (etag) headers.set("ETag", etag);
  if (lastModified) headers.set("Last-Modified", lastModified);

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
