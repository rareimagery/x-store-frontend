import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BuilderPopupCompatPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(resolved)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null) params.append(key, item);
      }
      continue;
    }

    if (value != null) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  redirect(query ? `/builder/new-tab?${query}` : "/builder/new-tab");
}
