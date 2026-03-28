"use client";

interface SupporterBadgeProps {
  tier: "rare_supporter" | "inner_circle";
  size?: "sm" | "md";
}

const TIER_LABELS: Record<string, string> = {
  rare_supporter: "Rare Supporter",
  inner_circle: "Inner Circle",
};

export default function SupporterBadge({ tier, size = "sm" }: SupporterBadgeProps) {
  const isInnerCircle = tier === "inner_circle";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold
        ${size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}
        ${isInnerCircle
          ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 ring-1 ring-amber-500/30"
          : "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20"
        }`}
      title={TIER_LABELS[tier]}
    >
      <svg
        className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {TIER_LABELS[tier]}
    </span>
  );
}
