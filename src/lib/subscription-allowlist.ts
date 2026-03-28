type IdentityInput = {
  xId?: string | null;
  xUsername?: string | null;
};

function normalize(value?: string | null): string {
  return (value || "").trim().replace(/^@+/, "").toLowerCase();
}

function allowlistSet(): Set<string> {
  const raw = process.env.FREE_SUBSCRIPTION_ALLOWLIST || "";
  return new Set(
    raw
      .split(",")
      .map((entry) => normalize(entry))
      .filter(Boolean)
  );
}

export function isFreeSubscriptionAllowlisted(identity: IdentityInput): boolean {
  const allowlist = allowlistSet();
  if (allowlist.size === 0) return false;

  const id = normalize(identity.xId);
  const username = normalize(identity.xUsername);

  return (id ? allowlist.has(id) : false) || (username ? allowlist.has(username) : false);
}
