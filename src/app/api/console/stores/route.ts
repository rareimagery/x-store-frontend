import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session as any).role !== "admin") {
    return NextResponse.json({ stores: [] }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?fields[commerce_store--online]=name,field_store_slug,field_store_status&sort=-created`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );

    if (!res.ok) return NextResponse.json({ stores: [] });

    const json = await res.json();
    const stores = (json.data || []).map((s: any) => ({
      id: s.id,
      slug: s.attributes?.field_store_slug || "",
      name: s.attributes?.name || "",
      status: s.attributes?.field_store_status || "pending",
    }));

    return NextResponse.json({ stores });
  } catch {
    return NextResponse.json({ stores: [] });
  }
}
