"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import ProductManager from "./ProductManager";
import WireframeBuilder from "./builder/WireframeBuilder";
import type { WireframeLayout, PlacedBlock } from "./builder/WireframeBuilder";
import type { XImportData } from "@/lib/x-import";
import type { GrokEnhancements } from "@/lib/grok";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net";

const STEPS = ["Store Info", "Creator Profile", "Choose Theme", "Add Products", "Go Live"];

interface StoreBuilderWizardProps {
  xUsername?: string;
  xImportData?: XImportData;
  grokEnhancements?: GrokEnhancements;
}

export default function StoreBuilderWizard({
  xUsername,
  xImportData,
  grokEnhancements,
}: StoreBuilderWizardProps) {
  const DRAFT_KEY = `store_wizard_draft_${xUsername || "anon"}`;

  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [storeLimitInfo, setStoreLimitInfo] = useState<{
    existingStoreCount?: number;
    maxAllowedStores?: number;
  } | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  // Auto-fill from X data + Grok enhancements
  const xName = xImportData?.displayName || xUsername || "";
  const xUser = xImportData?.username || xUsername || "";

  // Store fields — initialised from X data; overridden by persisted draft on mount
  const [storeName, setStoreName] = useState(xName ? `${xName}'s Store` : "");
  const [slug, setSlug] = useState(xUser.toLowerCase() || "");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [currency, setCurrency] = useState("USD");

  // Creator X Profile fields
  const [xUsernameField, setXUsernameField] = useState(xUser);
  const [bioDescription, setBioDescription] = useState(
    grokEnhancements?.storeBio || xImportData?.bio || ""
  );
  const [bioIsAI, setBioIsAI] = useState(!!grokEnhancements?.storeBio);
  const [followerCount, setFollowerCount] = useState(
    xImportData ? String(xImportData.followerCount) : ""
  );
  const [profilePictureUrl, setProfilePictureUrl] = useState(
    xImportData?.profileImageUrl || ""
  );
  const [backgroundBannerUrl, setBackgroundBannerUrl] = useState(
    xImportData?.bannerUrl || ""
  );

  // Restore draft from localStorage on first mount.
  // Only restore form fields (steps 0–1). Never restore to step >= 2
  // because those steps require a live storeId from the current session.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      // Only restore pre-creation steps
      if (draft.step !== undefined && draft.step <= 1) setStep(draft.step);
      if (draft.storeName) setStoreName(draft.storeName);
      if (draft.slug) { setSlug(draft.slug); setSlugEdited(true); }
      if (draft.ownerEmail) setOwnerEmail(draft.ownerEmail);
      if (draft.currency) setCurrency(draft.currency);
      if (draft.xUsernameField) setXUsernameField(draft.xUsernameField);
      if (draft.bioDescription) setBioDescription(draft.bioDescription);
      if (draft.followerCount) setFollowerCount(draft.followerCount);
      if (draft.profilePictureUrl) setProfilePictureUrl(draft.profilePictureUrl);
      if (draft.backgroundBannerUrl) setBackgroundBannerUrl(draft.backgroundBannerUrl);
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist relevant state to localStorage whenever it changes
  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          step,
          storeName,
          slug,
          ownerEmail,
          currency,
          xUsernameField,
          bioDescription,
          followerCount,
          profilePictureUrl,
          backgroundBannerUrl,
        })
      );
    } catch {
      // Storage quota exceeded — non-critical
    }
  }, [DRAFT_KEY, step, storeName, slug, ownerEmail, currency, xUsernameField, bioDescription, followerCount, profilePictureUrl, backgroundBannerUrl]);

  useEffect(() => {
    saveDraft();
  }, [saveDraft]);

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
  }
  const topPosts = xImportData?.topPosts
    ? JSON.stringify(xImportData.topPosts)
    : "";
  const topFollowers = xImportData?.topFollowers
    ? JSON.stringify(xImportData.topFollowers)
    : "";
  const metrics = xImportData?.metrics
    ? JSON.stringify({
        ...xImportData.metrics,
        ...(grokEnhancements
          ? {
              top_themes: grokEnhancements.topThemes,
              audience_sentiment: grokEnhancements.audienceSentiment,
              recommended_products: grokEnhancements.suggestedProducts,
            }
          : {}),
      })
    : "";

  // Grok recommended theme
  const recommendedTheme = grokEnhancements?.recommendedTheme || "default";

  // Legal agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // After store is created
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeDrupalId, setStoreDrupalId] = useState<string | null>(null);
  const [profileNodeId, setProfileNodeId] = useState<string | null>(null);
  const [wireframeLayout, setWireframeLayout] = useState<WireframeLayout | null>(null);

  /** Build a default wireframe layout from the creator's imported X profile data. */
  function buildDefaultWireframe(): WireframeLayout {
    let order = 0;
    const uid = () => `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

    const left: PlacedBlock[] = [];
    const center: PlacedBlock[] = [];
    const right: PlacedBlock[] = [];

    // Hero banner with their background image
    center.push({
      instanceId: uid(),
      type: "hero_banner",
      column: "center",
      order: order++,
      props: {
        heading: storeName || `${xUser}'s Store`,
        subheading: bioDescription || "Welcome to my store",
        background_image_url: backgroundBannerUrl || "",
        cta_text: "Shop Now",
        cta_url: `/${slug}/store`,
      },
    });

    // Social feed in left sidebar
    if (xImportData?.topPosts?.length) {
      left.push({
        instanceId: uid(),
        type: "social_feed",
        column: "left",
        order: 0,
        props: { heading: "Latest Posts", max_items: 5 },
      });
    }

    // Text block with their bio
    if (bioDescription) {
      left.push({
        instanceId: uid(),
        type: "text_block",
        column: "left",
        order: left.length,
        props: {
          heading: "About",
          body_text: bioDescription,
        },
      });
    }

    // Product grid in center
    center.push({
      instanceId: uid(),
      type: "product_grid",
      column: "center",
      order: order++,
      props: { heading: "Shop", max_items: 6, gallery_columns: 2 },
    });

    // CTA in right sidebar
    right.push({
      instanceId: uid(),
      type: "cta_section",
      column: "right",
      order: 0,
      props: {
        heading: "Follow Me",
        body_text: `Stay up to date with @${xUser}`,
        cta_text: "Follow on X",
        cta_url: `https://x.com/${xUser}`,
      },
    });

    // Newsletter in right sidebar
    right.push({
      instanceId: uid(),
      type: "newsletter",
      column: "right",
      order: 1,
      props: {
        heading: "Stay in the Loop",
        body_text: "Get notified about new drops and exclusives.",
        cta_text: "Subscribe",
      },
    });

    return { left, center, right };
  }

  function autoSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
  }

  function handleNameChange(name: string) {
    setStoreName(name);
    if (!slugEdited) setSlug(autoSlug(name));
  }

  async function handleCreateStore() {
    if (!agreedToTerms) {
      setError("You must agree to the Terms of Service, EULA, and Privacy Policy.");
      return;
    }
    setCreating(true);
    setError("");
    setStoreLimitInfo(null);

    try {
      const res = await fetch("/api/stores/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          slug,
          ownerEmail,
          currency,
          agreedToTerms: true,
          xUsername: xUsernameField || xUsername || slug,
          bioDescription,
          followerCount: followerCount ? parseInt(followerCount) : null,
          profilePictureUrl,
          backgroundBannerUrl,
          topPosts,
          topFollowers,
          metrics,
        }),
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        if (data?.storeLimitReached) {
          setStoreLimitInfo({
            existingStoreCount: data.existingStoreCount,
            maxAllowedStores: data.maxAllowedStores,
          });
        }

        const fallbackMessage = raw
          ? `Store creation failed (${res.status}). ${raw.slice(0, 180)}`
          : `Store creation failed (${res.status}).`;

        setError(data?.error || fallbackMessage);
        setCreating(false);
        return;
      }

      if (data?.partial && data?.warning) {
        setError(data.warning);
      }

      setStoreId(data?.storeId || null);
      setStoreDrupalId(data?.storeDrupalId || "");
      setProfileNodeId(data?.profileNodeId || "");

      // Build default wireframe layout from imported profile data
      setWireframeLayout(buildDefaultWireframe());

      clearDraft();  // Draft fulfilled — remove so retry doesn't loop
      setStep(2); // Jump to wireframe builder step
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error — please try again";
      setError(message);
    }
    setCreating(false);
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm text-zinc-400";
  const sectionClass = "rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8";

  return (
    <div className="mx-auto max-w-3xl">
      {/* Sign out link */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition"
        >
          Sign Out
        </button>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-between">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition ${
                  i < step
                    ? "bg-green-500 text-white"
                    : i === step
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {i < step ? "\u2713" : i + 1}
              </div>
              <span
                className={`mt-1.5 text-xs ${
                  i <= step ? "text-white" : "text-zinc-600"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-2 mt-[-1rem] h-0.5 w-8 sm:w-14 ${
                  i < step ? "bg-green-500" : "bg-zinc-800"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Store Info */}
      {step === 0 && (
        <div className={sectionClass}>
          <h2 className="mb-6 text-xl font-bold">Store Details</h2>

          <div className="space-y-5">
            <div>
              <label className={labelClass}>Store Name *</label>
              <input
                value={storeName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Awesome Store"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Subdomain *</label>
              <div className="flex items-center gap-2">
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(e.target.value.toLowerCase());
                  }}
                  placeholder="yourname"
                  required
                  className="w-48 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-zinc-500">.{BASE_DOMAIN}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                This will be your store URL
              </p>
            </div>

            <div>
              <label className={labelClass}>Contact Email *</label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Default Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={inputClass}
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
              </select>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(1)}
                disabled={!storeName || !slug || !ownerEmail}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                Next: Creator Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Creator Profile */}
      {step === 1 && (
        <div className={sectionClass}>
          <h2 className="mb-2 text-xl font-bold">Creator X Profile</h2>
          <p className="mb-6 text-sm text-zinc-400">
            Fill in your X (Twitter) profile details. These power your store
            page.
          </p>

          <div className="space-y-5">
            <div>
              <label className={labelClass}>X Username *</label>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">@</span>
                <input
                  value={xUsernameField}
                  onChange={(e) =>
                    setXUsernameField(e.target.value.replace(/^@/, ""))
                  }
                  placeholder="yourhandle"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                Bio / Description
                {bioIsAI && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                    AI suggested
                  </span>
                )}
              </label>
              <textarea
                value={bioDescription}
                onChange={(e) => {
                  setBioDescription(e.target.value);
                  setBioIsAI(false);
                }}
                placeholder="Tell people about yourself and your store..."
                rows={3}
                className={inputClass}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Profile Picture URL</label>
                <input
                  value={profilePictureUrl}
                  onChange={(e) => setProfilePictureUrl(e.target.value)}
                  placeholder="https://pbs.twimg.com/..."
                  className={inputClass}
                />
                {profilePictureUrl && (
                  <div className="mt-2">
                    <Image
                      src={profilePictureUrl}
                      alt="Profile picture"
                      width={80}
                      height={80}
                      className="rounded-full border border-zinc-700"
                      unoptimized
                    />
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Background Banner URL</label>
                <input
                  value={backgroundBannerUrl}
                  onChange={(e) => setBackgroundBannerUrl(e.target.value)}
                  placeholder="https://pbs.twimg.com/..."
                  className={inputClass}
                />
                {backgroundBannerUrl && (
                  <div className="mt-2">
                    <Image
                      src={backgroundBannerUrl}
                      alt="Banner"
                      width={320}
                      height={107}
                      className="rounded-lg border border-zinc-700 object-cover"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={labelClass}>Follower Count</label>
              <input
                type="number"
                value={followerCount}
                onChange={(e) => setFollowerCount(e.target.value)}
                placeholder="1000"
                className={inputClass}
              />
            </div>

            {/* Legal Agreement */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
              <h3 className="mb-3 text-sm font-semibold text-zinc-300">Legal Agreements</h3>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm text-zinc-400 group-hover:text-zinc-300">
                  I have read and agree to the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
                    Terms of Service
                  </a>
                  ,{" "}
                  <a href="/eula" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
                    End User License Agreement
                  </a>
                  , and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
                    Privacy Policy
                  </a>
                  . *
                </span>
              </label>
            </div>

            {error && (
              <div className="space-y-2 rounded-lg border border-amber-700 bg-amber-950/30 p-3">
                <p className="text-sm text-amber-300">{error}</p>
                {storeLimitInfo && (
                  <>
                    <p className="text-xs text-amber-400">
                      Current stores: {storeLimitInfo.existingStoreCount ?? "?"} / Allowed: {storeLimitInfo.maxAllowedStores ?? "?"}.
                    </p>
                    <p className="text-xs text-amber-400">
                      For testing, your allowlist/limit can be increased. For production, this can become a per-store add-on charge.
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(0)}
                className="rounded-lg border border-zinc-700 px-6 py-2.5 text-sm text-zinc-400 transition hover:bg-zinc-800"
              >
                Back
              </button>
              <button
                onClick={handleCreateStore}
                disabled={creating || !xUsernameField || !agreedToTerms}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {creating ? "Creating store..." : "Create Store & Continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Build Your Page */}
      {step === 2 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          <div className="px-8 pt-8 pb-4">
            <h2 className="mb-1 text-xl font-bold">Build Your Page</h2>
            <p className="mb-4 text-sm text-zinc-400">
              Drag components into the 3-column wireframe to design your landing page.
              We&apos;ve pre-filled blocks from your X profile — rearrange or edit them.
            </p>
          </div>

          {slug ? (
            <WireframeBuilder
              storeSlug={slug}
              initialLayout={wireframeLayout || undefined}
              onChange={(layout) => setWireframeLayout(layout)}
            />
          ) : (
            <div className="px-8 pb-8">
              <p className="text-sm text-zinc-500">
                Page builder will be available once your store is created.
              </p>
            </div>
          )}

          <div className="px-8 pb-8 pt-4 flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Continue to Products
            </button>
            <button
              onClick={() => setStep(3)}
              className="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Add Products */}
      {step === 3 && (
        <div className={sectionClass}>
          <h2 className="mb-2 text-xl font-bold">Add Products</h2>
          <p className="mb-6 text-sm text-zinc-400">
            Add products to start selling. You can always add more later.
          </p>

          {storeId && storeDrupalId ? (
            <ProductManager storeId={storeId} storeDrupalId={storeDrupalId} />
          ) : (
            <p className="text-sm text-zinc-500">
              Product manager unavailable — store ID missing.
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(4)}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Continue
            </button>
            <button
              onClick={() => setStep(4)}
              className="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Submitted — Pending Approval */}
      {step === 4 && (
        <div className={`${sectionClass} text-center`}>
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
            <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-amber-400">
            Store Submitted for Review
          </h2>
          <p className="mb-2 text-zinc-400">
            Your store at{" "}
            <span className="font-semibold text-white">
              {BASE_DOMAIN}/{slug}
            </span>{" "}
            has been created and is pending admin approval.
          </p>
          <p className="mb-6 text-sm text-zinc-500">
            We&apos;ll review your store shortly. Once approved, your landing
            page and store will go live.
          </p>

          <div className="flex justify-center gap-3">
            {storeId && (
              <a
                href={`/console/stores/${storeId}`}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Manage Store
              </a>
            )}
          </div>

          <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/50 p-6 text-left">
            <h3 className="mb-3 text-sm font-semibold text-zinc-300">
              While you wait
            </h3>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li>- Add more products from your store dashboard</li>
              <li>- Customize your theme and colors</li>
              <li>- Connect Stripe so payments are ready when you go live</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
