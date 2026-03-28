"use client";

import { createContext, useContext } from "react";

export interface ConsoleContextValue {
  stores: Array<{
    profileNodeId: string;
    storeName: string | null;
    storeSlug: string;
    storeId: string | null;
    storeDrupalId: string | null;
    storeStatus: string | null;
    currentTheme: string;
    xSubscriptionTier: string | null;
  }>;
  activeStoreId: string | null;
  role: "admin" | "creator" | "store_owner";
  xUsername: string | null;
  hasStore: boolean;
  storeId: string | null;
  storeDrupalId: string | null;
  profileNodeId: string | null;
  storeName: string | null;
  storeSlug: string | null;
  storeStatus: string | null;
  currentTheme: string | null;
  xSubscriptionTier: string | null;
}

const ConsoleContext = createContext<ConsoleContextValue>({
  stores: [],
  activeStoreId: null,
  role: "creator",
  xUsername: null,
  hasStore: false,
  storeId: null,
  storeDrupalId: null,
  profileNodeId: null,
  storeName: null,
  storeSlug: null,
  storeStatus: null,
  currentTheme: null,
  xSubscriptionTier: null,
});

export function ConsoleContextProvider({
  value,
  children,
}: {
  value: ConsoleContextValue;
  children: React.ReactNode;
}) {
  return (
    <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>
  );
}

export function useConsole() {
  return useContext(ConsoleContext);
}
