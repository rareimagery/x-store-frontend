import { redirect } from "next/navigation";
import { getProfileByStoreId } from "@/lib/drupal";

export default async function StoreThemeChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfileByStoreId(id);
  const handle = profile?.attributes?.field_x_username?.replace(/^@+/, "");

  if (handle) {
    redirect(`/builder/new-tab?handle=${encodeURIComponent(handle)}`);
  }

  redirect(`/console/stores/${id}`);
}
