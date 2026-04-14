"use client";

import { useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";

interface TrialStatus {
  status: string;
  trialStart: string | null;
  trialEnd: string | null;
  daysRemaining: number;
  plan: string | null;
  subscriptionId: string | null;
}

const PLANS = [
  {
    id: "creator_basic",
    name: "Creator",
    price: "$4",
    interval: "month",
    gens: "100",
    features: ["Your own subdomain", "Page builder + AI backgrounds", "Grok Product Creator", "Printful integration", "Social feeds"],
    highlight: true,
  },
  {
    id: "creator_pro",
    name: "Creator Pro",
    price: "$19",
    interval: "month",
    gens: "500",
    features: ["Everything in Creator", "500 AI generations/month", "Priority support", "Analytics dashboard"],
    highlight: false,
  },
  {
    id: "creator_unlimited",
    name: "Creator Unlimited",
    price: "$49",
    interval: "month",
    gens: "2,000",
    features: ["Everything in Pro", "2,000 AI generations/month", "API access", "Custom domain support"],
    highlight: false,
  },
];

export default function BillingPage() {
  const { hasStore } = useConsole();
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscriptions/trial-status")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setTrial(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
      </div>
    );
  }

  const isTrialing = trial?.status === "trialing";
  const isExpired = trial?.status === "expired" || trial?.status === "canceled";
  const isActive = trial?.status === "active";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-white mb-1">Billing & Plans</h1>
      <p className="text-xs text-zinc-500 mb-6">Manage your subscription and view available plans.</p>

      {/* Current status */}
      <div className={`rounded-xl border p-5 mb-8 ${
        isActive ? "border-green-700/40 bg-green-900/20" :
        isExpired ? "border-red-700/40 bg-red-900/20" :
        "border-amber-700/40 bg-amber-900/20"
      }`}>
        <div className="flex items-center gap-3">
          {isActive ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-300">Active Subscription</p>
                <p className="text-xs text-green-400/70">Plan: {trial?.plan === "creator_pro" ? "Creator Pro" : trial?.plan === "creator_unlimited" ? "Creator Unlimited" : "Creator"} — $4/month</p>
              </div>
            </>
          ) : isExpired ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-300">Trial Expired</p>
                <p className="text-xs text-red-400/70">Subscribe to reactivate your store and keep creating.</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-300">Free Trial</p>
                <p className="text-xs text-amber-400/70">{trial?.daysRemaining} day{trial?.daysRemaining !== 1 ? "s" : ""} remaining. Subscribe anytime to keep your store after the trial.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <h2 className="text-sm font-semibold text-white mb-4">Choose a Plan</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-xl border p-5 ${
              plan.highlight
                ? "border-purple-600 bg-purple-900/10 ring-1 ring-purple-600/30"
                : "border-zinc-800 bg-zinc-900"
            }`}
          >
            {plan.highlight && (
              <span className="inline-block rounded-full bg-purple-600 px-2.5 py-0.5 text-[10px] font-semibold text-white mb-3">
                Most Popular
              </span>
            )}
            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
            <div className="mt-1 mb-4">
              <span className="text-2xl font-bold text-white">{plan.price}</span>
              <span className="text-xs text-zinc-500">/{plan.interval}</span>
            </div>
            <p className="text-xs text-zinc-400 mb-4">{plan.gens} AI generations/month</p>
            <ul className="space-y-2 mb-5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                  <svg className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              disabled={isActive && trial?.plan === plan.id}
              className={`w-full rounded-lg py-2.5 text-xs font-semibold transition ${
                isActive && trial?.plan === plan.id
                  ? "bg-zinc-800 text-zinc-500 cursor-default"
                  : plan.highlight
                    ? "bg-purple-600 text-white hover:bg-purple-500"
                    : "bg-zinc-800 text-white hover:bg-zinc-700"
              }`}
            >
              {isActive && trial?.plan === plan.id ? "Current Plan" : "Subscribe"}
            </button>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="mt-10 space-y-4">
        <h2 className="text-sm font-semibold text-white">Frequently Asked</h2>
        {[
          { q: "What happens after my trial?", a: "Your store stays up but features are limited. Subscribe to keep full access. Your content is never deleted." },
          { q: "Can I cancel anytime?", a: "Yes. Cancel from this page anytime. Your store stays accessible until the end of the billing period." },
          { q: "What are AI generations?", a: "Each time Grok creates a design or background, it uses 1 generation. Extra generations after your plan limit cost $0.25 each." },
          { q: "Can I upgrade or downgrade?", a: "Yes. Changes take effect on your next billing cycle. No proration fees." },
        ].map((faq, i) => (
          <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-semibold text-zinc-300">{faq.q}</p>
            <p className="text-[11px] text-zinc-500 mt-1">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
