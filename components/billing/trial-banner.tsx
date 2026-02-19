"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { getWorkspaceSubscriptionStatus } from "@/lib/api/subscriptions";
import { X } from "lucide-react";
import Link from "next/link";

export function TrialBanner() {
  const { currentWorkspace } = useWorkspace();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    getWorkspaceSubscriptionStatus(currentWorkspace.id).then((s) => {
      setDaysLeft(s.trialDaysRemaining);
      setStatus(s.status);
    });
  }, [currentWorkspace?.id]);

  if (dismissed) return null;
  if (status === "active") return null;
  if (status === "trialing" && daysLeft !== null && daysLeft > 5) return null;
  if (daysLeft === null && status !== "expired") return null;

  const isExpired = status === "expired";
  const isUrgent = !isExpired && daysLeft !== null && daysLeft <= 3;

  return (
    <div className={`relative flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium ${isExpired ? "bg-red-600 text-white" : isUrgent ? "bg-red-500 text-white" : "bg-yellow-500 text-yellow-950"}`}>
      <span>
        {isExpired
          ? "Your trial has expired. Upgrade to continue using all features."
          : `Your trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Upgrade now to keep your data.`}
      </span>
      <Link
        href="/billing"
        className={`rounded-md px-3 py-1 text-xs font-semibold ${isExpired || isUrgent ? "bg-white text-red-600 hover:bg-white/90" : "bg-yellow-900 text-white hover:bg-yellow-800"}`}
      >
        Upgrade
      </Link>
      {!isExpired && (
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-black/10"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
