"use client";

import LivePreview from "@/components/builder/LivePreview";

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
  code?: string;
}

export default function ChatMessage({ msg }: { msg: ChatMsg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2.5 text-sm text-white break-words">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {msg.text && (
        <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 whitespace-pre-wrap break-words">
          {msg.text}
        </div>
      )}
      {msg.code && (
        <div className="rounded-xl overflow-hidden border border-zinc-700">
          <LivePreview code={msg.code} />
        </div>
      )}
    </div>
  );
}
