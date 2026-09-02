import React, { useState } from "react";
import { Database } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * Phase 10 — clear development/demo state indicator.
 * Shown ONLY when no backend is configured, so demo data can never masquerade
 * as a real deployment. Dismissible, non-intrusive.
 */
export const ModeBadge: React.FC = () => {
  const { appDataMode } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (appDataMode !== "local" || dismissed) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <div
        data-testid="mode-badge"
        className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300/60 dark:border-amber-400/30 text-amber-700 dark:text-amber-300"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Database className="w-3.5 h-3.5 shrink-0" />
          <p className="text-xs font-bold truncate">
            LOCAL DEMO MODE — data is stored in your browser only. Configure
            Supabase (see .env.example) to enable real accounts &amp; cloud
            data.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs font-bold underline shrink-0 hover:no-underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
