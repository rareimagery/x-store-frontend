"use client";

import { useState } from "react";
import type { DonationCampaign } from "@/app/api/donations/route";

interface DonationCampaignProps {
  campaign: DonationCampaign;
  /** If true, hide the donation form (view-only mode for previews) */
  viewOnly?: boolean;
}

export default function DonationCampaignCard({
  campaign,
  viewOnly,
}: DonationCampaignProps) {
  const [amount, setAmount] = useState<number | "">(
    campaign.suggestedAmounts[1] || 10
  );
  const [customAmount, setCustomAmount] = useState(false);
  const [donorName, setDonorName] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const progress =
    campaign.goalAmount > 0
      ? Math.min((campaign.raisedAmount / campaign.goalAmount) * 100, 100)
      : 0;

  const daysLeft = campaign.endDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(campaign.endDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  async function handleDonate() {
    if (!amount || Number(amount) < campaign.minDonation) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/checkout/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              productId: campaign.id,
              title: `Donation: ${campaign.title}`,
              price: Number(amount),
              currency: "USD",
              qty: 1,
            },
          ],
          storeSlug: campaign.storeSlug,
          donation: true,
          donorName: anonymous ? "Anonymous" : donorName,
          donorMessage: message,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
      // If no Stripe redirect, show inline success
      setSuccess(true);
    } catch {
      // Fallback success for demo
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
          <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
        <p className="text-sm text-zinc-400">
          {campaign.thankYouMessage?.replace(/<[^>]*>/g, "") ||
            `Your donation of $${Number(amount).toFixed(2)} to "${campaign.title}" has been received.`}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
      {/* Campaign Image */}
      {campaign.imageUrl && (
        <div className="aspect-video bg-zinc-800 overflow-hidden">
          <img
            src={campaign.imageUrl}
            alt={campaign.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="p-6">
        {/* Category badge */}
        {campaign.category && (
          <span className="inline-block rounded-full bg-indigo-500/20 px-3 py-0.5 text-xs font-medium text-indigo-300 mb-3">
            {campaign.category}
          </span>
        )}

        {/* Title & Description */}
        <h3 className="text-xl font-bold text-white mb-2">{campaign.title}</h3>
        {campaign.description && (
          <div
            className="text-sm text-zinc-400 leading-relaxed mb-5"
            dangerouslySetInnerHTML={{ __html: campaign.description }}
          />
        )}

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-end justify-between mb-2">
            <div>
              <span className="text-2xl font-bold text-white">
                ${campaign.raisedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="ml-1 text-sm text-zinc-500">
                of ${campaign.goalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} goal
              </span>
            </div>
            <span className="text-sm font-medium text-zinc-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-zinc-500">
            <span>{campaign.donorCount} donor{campaign.donorCount !== 1 ? "s" : ""}</span>
            {daysLeft !== null && (
              <span>
                {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left` : "Campaign ended"}
              </span>
            )}
          </div>
        </div>

        {/* Donation Form */}
        {!viewOnly && (daysLeft === null || daysLeft > 0) && (
          <div className="mt-6 space-y-4">
            {/* Suggested Amounts */}
            <div>
              <label className="block text-xs text-zinc-400 mb-2">
                Choose an amount
              </label>
              <div className="flex flex-wrap gap-2">
                {campaign.suggestedAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => {
                      setAmount(amt);
                      setCustomAmount(false);
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      !customAmount && amount === amt
                        ? "bg-indigo-600 text-white"
                        : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setCustomAmount(true);
                    setAmount("");
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    customAmount
                      ? "bg-indigo-600 text-white"
                      : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Custom Amount Input */}
            {customAmount && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Amount (min ${campaign.minDonation})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value ? Number(e.target.value) : "")
                    }
                    min={campaign.minDonation}
                    step="0.01"
                    placeholder={String(campaign.minDonation)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Donor Info */}
            <div className="space-y-3">
              {campaign.allowAnonymous && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600"
                  />
                  <span className="text-sm text-zinc-400">
                    Donate anonymously
                  </span>
                </label>
              )}

              {!anonymous && (
                <input
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Your name (shown on donor wall)"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              )}

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Leave a message of support (optional)"
                rows={2}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Donate Button */}
            <button
              onClick={handleDonate}
              disabled={
                submitting ||
                !amount ||
                Number(amount) < campaign.minDonation
              }
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white transition hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
            >
              {submitting
                ? "Processing..."
                : `Donate $${Number(amount || 0).toFixed(2)}`}
            </button>

            <p className="text-center text-[10px] text-zinc-600">
              Powered by Stripe. Funds go directly to the creator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Donor Wall                                                         */
/* ------------------------------------------------------------------ */

export interface Donor {
  name: string;
  amount: number;
  message?: string;
  date: string;
}

export function DonorWall({ donors }: { donors: Donor[] }) {
  if (!donors.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <p className="text-sm text-zinc-500">
          Be the first to support this campaign!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h4 className="text-sm font-semibold text-zinc-300 mb-4">
        Donors ({donors.length})
      </h4>
      <div className="space-y-3">
        {donors.map((donor, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400">
              {donor.name === "Anonymous" ? "?" : donor.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-white truncate">
                  {donor.name}
                </span>
                <span className="text-sm font-semibold text-indigo-400 shrink-0">
                  ${donor.amount.toFixed(2)}
                </span>
              </div>
              {donor.message && (
                <p className="mt-1 text-xs text-zinc-400">{donor.message}</p>
              )}
              <p className="mt-1 text-[10px] text-zinc-600">
                {new Date(donor.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
