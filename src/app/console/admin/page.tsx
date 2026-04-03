import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import StoreApprovalButton from "@/components/StoreApprovalButton";
import { authOptions } from "@/lib/auth";
import { getAllStoresForAdmin } from "@/lib/drupal";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session as any).role !== "admin") {
    redirect("/console");
  }

  const { data: stores, included } = await getAllStoresForAdmin();
  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN;

  const pendingCount = stores.filter(
    (s: any) => s.attributes.field_store_status !== "approved"
  ).length;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            All Stores ({stores.length})
          </h1>
          {pendingCount > 0 && (
            <p className="mt-1 text-sm text-amber-400">
              {pendingCount} store{pendingCount !== 1 ? "s" : ""} pending
              approval
            </p>
          )}
        </div>
        <Link
          href="/console/stores/new"
          className="inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          + Create New Store
        </Link>
      </div>

      {stores.length === 0 ? (
        <p className="text-zinc-500">No stores yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-400">Store Name</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Slug</th>
                <th className="px-4 py-3 font-medium text-zinc-400">X Username</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Created</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Status</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {stores.map((store: any) => {
                const slug = store.attributes.field_store_slug;
                const storeStatus =
                  store.attributes.field_store_status || "pending";
                const xProfileRef =
                  store.relationships?.field_linked_x_profile?.data;
                const xProfile = xProfileRef
                  ? included.find((inc: any) => inc.id === xProfileRef.id)
                  : null;

                return (
                  <tr key={store.id} className="hover:bg-zinc-900/40">
                    <td className="px-4 py-3 font-medium text-white">
                      {store.attributes.name}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://www.rareimagery.net/${slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300"
                      >
                        {slug}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {xProfile?.attributes?.field_x_username || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(store.attributes.created).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <StoreApprovalButton
                        storeId={store.id}
                        currentStatus={storeStatus}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/console/stores/${store.id}`}
                        className="text-indigo-400 hover:text-indigo-300"
                      >
                        Manage
                      </Link>
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
