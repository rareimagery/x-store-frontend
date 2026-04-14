"use client";

/**
 * TrialGate — currently a pass-through while we build X Money integration.
 * All users get full access. Re-enable enforcement when X Money is live.
 */
export default function TrialGate({ children }: { feature?: string; children: React.ReactNode }) {
  return <>{children}</>;
}
