import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  notifyStoreApproved,
  notifyStoreRejected,
  notifyCreator,
} from "@/lib/notifications";

import { drupalAuthHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req });

  if (!token || token.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { storeId, status } = await req.json();

  if (!storeId || !["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid storeId or status (approved | rejected | pending)" },
      { status: 400 }
    );
  }

  const res = await fetch(
    `${DRUPAL_API}/jsonapi/commerce_store/online/${storeId}`,
    {
      method: "PATCH",
      headers: {
        ...drupalAuthHeaders(),
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "commerce_store--online",
          id: storeId,
          attributes: {
            field_store_status: status,
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Drupal update failed: ${res.status} — ${text.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const storeName = data.data?.attributes?.name || "Unknown Store";
  const storeSlug = data.data?.attributes?.field_store_slug || "";
  const ownerEmail = data.data?.attributes?.mail || "";

  // Send notification to the store owner (fire-and-forget)
  if (ownerEmail) {
    // Fetch owner phone for SMS (if configured)
    let ownerPhone: string | null = null;
    try {
      const profileRes = await fetch(
        `${DRUPAL_API}/jsonapi/node/x_user_profile?filter[field_linked_store.id]=${storeId}&include=uid`,
        { headers: { ...drupalAuthHeaders() } }
      );
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const userId =
          profileData.data?.[0]?.relationships?.uid?.data?.id;
        if (userId) {
          const userRes = await fetch(
            `${DRUPAL_API}/jsonapi/user/user/${userId}`,
            { headers: { ...drupalAuthHeaders() } }
          );
          if (userRes.ok) {
            const userData = await userRes.json();
            ownerPhone =
              userData.data?.attributes?.field_phone_number || null;
          }
        }
      }
    } catch {
      // Phone lookup failed — proceed without SMS
    }

    if (status === "approved") {
      notifyStoreApproved(ownerEmail, storeName, storeSlug, ownerPhone).catch(
        (err) => console.error("Approval notification failed:", err)
      );
      // Also send DM via X
      notifyCreator({ type: "approved", xUsername: storeSlug, email: ownerEmail, storeName, storeSlug }).catch(() => {});
    } else if (status === "rejected") {
      notifyStoreRejected(ownerEmail, storeName, ownerPhone).catch((err) =>
        console.error("Rejection notification failed:", err)
      );
      notifyCreator({ type: "rejected", xUsername: storeSlug, email: ownerEmail, storeName }).catch(() => {});
    }
  }

  return NextResponse.json({
    success: true,
    storeId,
    status,
    storeName,
  });
}
