import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getAllUsersForAdmin } from "@/lib/drupal";
import StoreApprovalButton from "@/components/StoreApprovalButton";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session as any).role !== "admin") {
    redirect("/console");
  }

  const { data: profiles, included } = await getAllUsersForAdmin();
  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net";

  const pendingCount = profiles.filter((p: any) => {
    const storeRef = p.relationships?.field_linked_store?.data;
    if (!storeRef) return false;
    const store = included.find((inc: any) => inc.id === storeRef.id);
    return store?.attributes?.field_store_status !== "approved";
  }).length;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            User Accounts ({profiles.length})
          </h1>
          {pendingCount > 0 && (
            <p className="mt-1 text-sm text-amber-400">
              {pendingCount} user{pendingCount !== 1 ? "s" : ""} pending
              approval
            </p>
          )}
        </div>
      </div>

      {profiles.length === 0 ? (
        <p className="text-zinc-500">No users yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/60">
                <tr>
                  <th className="px-4 py-3 font-medium text-zinc-400">X Username</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">Profile</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">Store</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">Tier</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">Joined</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">Store Status</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {profiles.map((profile: any) => {
                  const xUsername =
                    profile.attributes?.field_x_username || "";
                  const tier =
                    profile.attributes?.field_x_subscription_tier || "none";
                  const created = profile.attributes?.created;
                  const storeRef =
                    profile.relationships?.field_linked_store?.data;
                  const store = storeRef
                    ? included.find((inc: any) => inc.id === storeRef.id)
                    : null;
                  const storeSlug =
                    store?.attributes?.field_store_slug || null;
                  const storeStatus =
                    store?.attributes?.field_store_status || null;
                  const storeName = store?.attributes?.name || null;

                  const tierLabel: Record<string, string> = {
                    none: "Free",
                    rare_supporter: "Supporter",
                    inner_circle: "Inner Circle",
                  };
                  const tierColor: Record<string, string> = {
                    none: "text-zinc-500",
                    rare_supporter: "text-indigo-400",
                    inner_circle: "text-amber-400",
                  };

                  return (
                    <tr key={profile.id} className="hover:bg-zinc-900/40">
                      <td className="px-4 py-3 font-medium text-white">
                        {xUsername ? (
                          <a
                            href={`https://x.com/${xUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300"
                          >
                            @{xUsername}
                          </a>
                        ) : (
                          <span className="text-zinc-500">&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {profile.attributes?.title || "\u2014"}
                      </td>
                      <td className="px-4 py-3">
                        {storeSlug ? (
                          <a
                            href={`https://${storeSlug}.${base}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300"
                          >
                            {storeName || storeSlug}
                          </a>
                        ) : (
                          <span className="text-zinc-500">No store</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${tierColor[tier] || "text-zinc-500"}`}>
                        {tierLabel[tier] || tier}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {created
                          ? new Date(created).toLocaleDateString()
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-3">
                        {store ? (
                          <StoreApprovalButton
                            storeId={store.id}
                            currentStatus={storeStatus || "pending"}
                          />
                        ) : (
                          <span className="text-zinc-600 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {store ? (
                          <Link
                            href={`/console/stores/${store.id}`}
                            className="text-indigo-400 hover:text-indigo-300 text-xs"
                          >
                            Manage Store
                          </Link>
                        ) : (
                          <span className="text-zinc-600 text-xs">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
