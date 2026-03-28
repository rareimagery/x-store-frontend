"use client";

import { useState } from "react";
import { useConsole } from "@/components/ConsoleContext";

interface ImportStepProps {
  onComplete: (handle: string) => void;
  isLoading?: boolean;
}

export default function ImportStep({ onComplete, isLoading = false }: ImportStepProps) {
  const [handle, setHandle] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const { xUsername } = useConsole();

  const handleImport = async () => {
    if (!handle.trim()) return;
    
    setIsImporting(true);
    
    try {
      const response = await fetch('/api/stores/import-x-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: handle.trim() }),
      });
      
      if (response.ok) {
        const data = await response.json();
        onComplete(handle.trim());
      } else {
        alert("Import failed. Please check the username and try again.");
      }
    } catch (error) {
      console.error("Import error:", error);
      alert("Failed to import X profile");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">Import Your X Profile</h2>
        <p className="text-zinc-400 text-lg">
          Start by importing your X profile. We'll pull your bio, posts, followers, and media.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              X Username
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-3.5 text-zinc-500">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="yourusername"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl pl-8 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                  disabled={isImporting || isLoading}
                />
              </div>
              <button
                onClick={handleImport}
                disabled={isImporting || isLoading || !handle.trim()}
                className="px-8 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? "Importing..." : "Import Profile"}
              </button>
            </div>
          </div>

          {xUsername && (
            <div className="text-center text-sm text-zinc-500">
              Currently signed in as <span className="text-white">@{xUsername}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-zinc-500">
        Your data stays private. We only import public profile information.
      </div>
    </div>
  );
}
