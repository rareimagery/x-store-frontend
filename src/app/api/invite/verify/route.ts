import { NextRequest, NextResponse } from "next/server";
import { drupalAuthHeaders } from "@/lib/drupal";
import { createRateLimiter, getClientIP, rateLimitResponse } from "@/lib/rate-limit";

const DRUPAL_API = process.env.DRUPAL_API_URL;

const inviteRateLimit = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 }); // 10/hour

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = inviteRateLimit(ip);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const { code } = await req.json();

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const upperCode = code.trim().toUpperCase();

  try {
    // Look up invite code node in Drupal by field_invite_code
    const params = new URLSearchParams({
      "filter[field_invite_code]": upperCode,
      "filter[status]": "1", // only published (active) codes
    });

    const res = await fetch(
      `${DRUPAL_API}/jsonapi/node/invite_code?${params.toString()}`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Service error" }, { status: 500 });
    }

    const data = await res.json();
    const codes = data?.data || [];

    if (codes.length === 0) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 403 }
      );
    }

    const inviteNode = codes[0];
    const maxUses = inviteNode.attributes?.field_max_uses ?? 1;
    const currentUses = inviteNode.attributes?.field_current_uses ?? 0;

    // Check if code has remaining uses
    if (currentUses >= maxUses) {
      return NextResponse.json(
        { error: "Invite code has been fully used" },
        { status: 403 }
      );
    }

    // Increment usage count (fire-and-forget)
    fetch(`${DRUPAL_API}/jsonapi/node/invite_code/${inviteNode.id}`, {
      method: "PATCH",
      headers: {
        ...drupalAuthHeaders(),
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "node--invite_code",
          id: inviteNode.id,
          attributes: {
            field_current_uses: currentUses + 1,
          },
        },
      }),
    }).catch(() => {});

    return NextResponse.json({ valid: true });
  } catch (err) {
    console.error("Invite verify error:", err);
    return NextResponse.json({ error: "Service error" }, { status: 500 });
  }
}
