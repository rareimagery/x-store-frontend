import { redirect } from "next/navigation";
import { getProfileByStoreId } from "@/lib/drupal";

export default async function StoreThemePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfileByStoreId(id);
  const handle = profile?.attributes?.field_x_username?.replace(/^@+/, "");

  if (handle) {
    redirect(`/console/page-building`);
  }

  redirect(`/console/stores/${id}`);
}
