"use client";

import { useConsole } from "@/components/ConsoleContext";
import CostDashboard from "@/components/CostDashboard";

export default function CostDashboardPage() {
  const { role } = useConsole();

  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Admin Only</h2>
          <p className="text-sm text-zinc-500">The cost dashboard is only available to administrators.</p>
        </div>
      </div>
    );
  }

  return <CostDashboard />;
}
