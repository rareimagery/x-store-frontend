import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import SubscriberTierControl from "@/components/SubscriberTierControl";

interface ProfileRow {
  id: string;
  username: string;
  displayName: string;
  followers: number;
  tier: string;
  subscriberSince: string | null;
  joinedDate: string | null;
  verified: boolean;
  storeSlug: string | null;
  profilePic: string | null;
}

interface InviteCode {
  code: string;
  x_username: string | null;
  used_by: string | null;
  used: boolean;
  created: string;
  used_at: string | null;
}

async function getAllProfiles(): Promise<ProfileRow[]> {
  if (!DRUPAL_API_URL) return [];
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?page[limit]=100&include=field_linked_store&fields[node--x_user_profile]=title,field_x_username,field_x_display_name,field_x_followers,field_x_subscription_tier,field_x_subscriber_since,field_x_joined_date,field_x_verified,field_x_avatar_url&fields[commerce_store--online]=field_store_slug`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const included = json.included || [];

    return (json.data || []).map((n: any) => {
      const a = n.attributes;
      const storeRef = n.relationships?.field_linked_store?.data;
      let storeSlug: string | null = null;
      if (storeRef?.id) {
        const store = included.find((i: any) => i.id === storeRef.id);
        storeSlug = store?.attributes?.field_store_slug || null;
      }
      return {
        id: n.id,
        username: a.field_x_username || "",
        displayName: a.field_x_display_name || a.title || "",
        followers: a.field_x_followers || 0,
        tier: a.field_x_subscription_tier || "none",
        subscriberSince: a.field_x_subscriber_since || null,
        joinedDate: a.field_x_joined_date || null,
        verified: a.field_x_verified || false,
        storeSlug,
        profilePic: a.field_x_avatar_url || null,
      };
    });
  } catch { return []; }
}

async function getInviteCodes(): Promise<InviteCode[]> {
  if (!DRUPAL_API_URL) return [];
  try {
    const res = await fetch(`${DRUPAL_API_URL}/api/invite/list`, {
      headers: drupalAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.codes || [];
  } catch { return []; }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  inner_circle: { label: "Inner Circle", color: "bg-amber-500/20 text-amber-400" },
  rare_supporter: { label: "Rare Supporter", color: "bg-indigo-500/20 text-indigo-400" },
  none: { label: "Free", color: "bg-zinc-700/40 text-zinc-500" },
};

export default async function AdminSubscribersPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session as any).role !== "admin") {
    redirect("/console");
  }

  const [profiles, inviteCodes] = await Promise.all([
    getAllProfiles(),
    getInviteCodes(),
  ]);

  // Build a map of invite codes used by each username
  const inviteByUser: Record<string, InviteCode> = {};
  for (const code of inviteCodes) {
    if (code.used_by) {
      inviteByUser[code.used_by.toLowerCase()] = code;
    }
  }

  const usedCodes = inviteCodes.filter((c) => c.used);
  const availableCodes = inviteCodes.filter((c) => !c.used);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Subscribers & Users</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {profiles.length} users, {usedCodes.length} invite codes redeemed, {availableCodes.length} codes available
          </p>
        </div>
        <Link
          href="/console/admin/invites"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition"
        >
          Manage Invite Codes
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <p className="text-2xl font-bold text-white">{profiles.length}</p>
          <p className="text-xs text-zinc-500">Total Users</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{profiles.filter((p) => p.storeSlug).length}</p>
          <p className="text-xs text-zinc-500">With Stores</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-400">{usedCodes.length}</p>
          <p className="text-xs text-zinc-500">Invites Used</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <p className="text-2xl font-bold text-zinc-400">{availableCodes.length}</p>
          <p className="text-xs text-zinc-500">Invites Available</p>
        </div>
      </div>

      {/* Main users table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-400">User</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Followers</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Store</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Invite Code</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Joined</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Tier</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {profiles.map((p) => {
                const invite = inviteByUser[p.username.toLowerCase()];
                const tierInfo = TIER_LABELS[p.tier] || TIER_LABELS.none;
                return (
                  <tr key={p.id} className="hover:bg-zinc-900/40">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {p.profilePic ? (
                          <img src={p.profilePic} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400">
                            {p.username[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1">
                            <a
                              href={`https://x.com/${p.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-white hover:text-indigo-400 transition"
                            >
                              {p.displayName || p.username}
                            </a>
                            {p.verified && (
                              <svg className="h-3.5 w-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" />
                              </svg>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-600">@{p.username}</p>
                        </div>
                      </div>
                    </td>

                    {/* Followers */}
                    <td className="px-4 py-3 text-zinc-400">
                      {p.followers > 0 ? formatCount(p.followers) : "—"}
                    </td>

                    {/* Store */}
                    <td className="px-4 py-3">
                      {p.storeSlug ? (
                        <a
                          href={`https://www.rareimagery.net/${p.storeSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-400 hover:underline"
                        >
                          /{p.storeSlug}
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-700">No store</span>
                      )}
                    </td>

                    {/* Invite Code */}
                    <td className="px-4 py-3">
                      {invite ? (
                        <div>
                          <code className="text-[10px] font-mono text-zinc-400">{invite.code}</code>
                          {invite.used_at && (
                            <p className="text-[9px] text-zinc-700">{invite.used_at}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-700">—</span>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {p.subscriberSince
                        ? new Date(p.subscriberSince).toLocaleDateString()
                        : p.joinedDate
                          ? new Date(p.joinedDate).toLocaleDateString()
                          : "—"}
                    </td>

                    {/* Tier */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${tierInfo.color}`}>
                        {tierInfo.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <SubscriberTierControl
                        xUsername={p.username}
                        currentTier={p.tier}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent invite activity */}
      {usedCodes.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Recent Invite Redemptions</h2>
          <div className="space-y-2">
            {usedCodes.slice(0, 10).map((c) => (
              <div key={c.code} className="flex items-center gap-3 text-xs">
                <code className="font-mono text-zinc-500 w-28">{c.code}</code>
                <span className="text-zinc-400">
                  {c.used_by ? (
                    <a href={`https://x.com/${c.used_by}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                      @{c.used_by}
                    </a>
                  ) : "Unknown"}
                </span>
                <span className="text-zinc-700 ml-auto">{c.used_at || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
