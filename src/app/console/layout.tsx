import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { getConsoleProfiles, getConsoleProfilesByEmail } from "@/lib/drupal";
import {
  ConsoleContextProvider,
  ConsoleContextValue,
} from "@/components/ConsoleContext";
import ConsoleShell from "@/components/ConsoleShell";

const ACTIVE_STORE_COOKIE = "ri_active_store_id";

type ConsoleSession = {
  role?: ConsoleContextValue["role"];
  xUsername?: string;
  storeSlug?: string;
  user?: {
    email?: string | null;
  };
};

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const consoleSession = session as ConsoleSession;

  const role = (consoleSession.role || "creator") as ConsoleContextValue["role"];
  const xUsername =
    consoleSession.xUsername || consoleSession.storeSlug || null;

  let stores = xUsername ? await getConsoleProfiles(xUsername) : [];
  if (!stores.length && consoleSession.user?.email) {
    stores = await getConsoleProfilesByEmail(consoleSession.user.email);
  }

  const cookieStore = await cookies();
  const preferredStoreId = cookieStore.get(ACTIVE_STORE_COOKIE)?.value || null;
  const storeData =
    stores.find((store) => store.storeId && store.storeId === preferredStoreId) ||
    stores.find((store) => !!store.storeId) ||
    stores[0] ||
    null;

  const contextValue: ConsoleContextValue = {
    stores,
    activeStoreId: storeData?.storeId || null,
    role,
    xUsername,
    hasStore: !!storeData?.storeId,
    storeId: storeData?.storeId || null,
    storeDrupalId: storeData?.storeDrupalId || null,
    profileNodeId: storeData?.profileNodeId || null,
    storeName: storeData?.storeName || null,
    storeSlug: storeData?.storeSlug || null,
    storeStatus: storeData?.storeStatus || null,
    currentTheme: storeData?.currentTheme || null,
    xSubscriptionTier: storeData?.xSubscriptionTier || null,
  };

  return (
    <ConsoleContextProvider value={contextValue}>
      <ConsoleShell>{children}</ConsoleShell>
    </ConsoleContextProvider>
  );
}
