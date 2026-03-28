"use client";

interface SubscribeOnXButtonProps {
  creatorHandle?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function SubscribeOnXButton({
  creatorHandle = "RareImagery",
  size = "md",
  className = "",
}: SubscribeOnXButtonProps) {
  const normalizedHandle = creatorHandle.replace(/^@+/, "").trim() || "RareImagery";
  const subscribeUrl = `https://x.com/${encodeURIComponent(normalizedHandle)}/creator-subscriptions/subscribe`;

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
  };

  return (
    <a
      href={subscribeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center font-semibold rounded-lg bg-amber-500 text-black
                  hover:bg-amber-400 transition-colors ${sizeClasses[size]} ${className}`}
    >
      <svg className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      Subscribe on X
    </a>
  );
}
