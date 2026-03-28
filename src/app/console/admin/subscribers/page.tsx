import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getSubscriberProfiles, getAllProfilesForAdmin } from "@/lib/drupal";
import SubscriberTierControl from "@/components/SubscriberTierControl";

export default async function AdminSubscribersPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session as any).role !== "admin") {
    redirect("/console");
  }

  const [subscribers, allProfiles] = await Promise.all([
    getSubscriberProfiles(),
    getAllProfilesForAdmin(),
  ]);

  const TIER_LABELS: Record<string, string> = {
    rare_supporter: "Rare Supporter",
    inner_circle: "Inner Circle",
    none: "None",
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">X Subscribers ({subscribers.length})</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage platform supporter tiers for creators.
          </p>
        </div>
        <Link
          href="/console/admin"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          &larr; Back to All Stores
        </Link>
      </div>

      {/* Active Subscribers */}
      {subscribers.length > 0 && (
        <div className="mb-8 overflow-hidden rounded-xl border border-zinc-800">
          <div className="overflow-x-auto">
          <table className="min-w-[680px] w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-400">Creator</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Tier</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Since</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {subscribers.map((sub: any) => (
                <tr key={sub.id} className="hover:bg-zinc-900/40">
                  <td className="px-4 py-3">
                    <span className="font-medium text-white">
                      @{sub.attributes.field_x_username}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      sub.attributes.field_x_subscription_tier === "inner_circle"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-amber-500/10 text-amber-400/80"
                    }`}>
                      {TIER_LABELS[sub.attributes.field_x_subscription_tier] || sub.attributes.field_x_subscription_tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {sub.attributes.field_x_subscriber_since
                      ? new Date(sub.attributes.field_x_subscriber_since).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <SubscriberTierControl
                      xUsername={sub.attributes.field_x_username}
                      currentTier={sub.attributes.field_x_subscription_tier}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Set tier for any creator */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">All Creators</h2>
        <p className="mb-4 text-sm text-zinc-400">
          Set or change subscription tier for any creator.
        </p>
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60">
              <tr>
                <th className="px-4 py-2 font-medium text-zinc-400">Creator</th>
                <th className="px-4 py-2 font-medium text-zinc-400">Current Tier</th>
                <th className="px-4 py-2 font-medium text-zinc-400">Set Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {allProfiles.map((profile: any) => (
                <tr key={profile.id} className="hover:bg-zinc-900/40">
                  <td className="px-4 py-2 text-white">
                    @{profile.attributes.field_x_username}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {TIER_LABELS[profile.attributes.field_x_subscription_tier] || "None"}
                  </td>
                  <td className="px-4 py-2">
                    <SubscriberTierControl
                      xUsername={profile.attributes.field_x_username}
                      currentTier={profile.attributes.field_x_subscription_tier || "none"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
