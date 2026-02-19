"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { getWorkspaceSubscriptionStatus } from "@/lib/api/subscriptions";
import { Crown, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

export function PlanBadge() {
  const { currentWorkspace } = useWorkspace();
  const [status, setStatus] = useState<{
    isActive: boolean;
    status: string;
    planName: string;
    trialDaysRemaining: number;
    isTrialing: boolean;
  } | null>(null);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    getWorkspaceSubscriptionStatus(currentWorkspace.id).then((s) => {
      setStatus({
        ...s,
        planName: s.plan?.name ?? "No Plan",
      });
    });
  }, [currentWorkspace?.id]);

  if (!status) return null;

  if (status.isTrialing) {
    const urgent = status.trialDaysRemaining <= 3;
    return (
      <Link href="/billing" className="block px-3 py-2">
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${urgent ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400" : "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"}`}>
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0">
            <div className="font-medium">Trial</div>
            <div className="truncate">{status.trialDaysRemaining}d remaining</div>
          </div>
        </div>
      </Link>
    );
  }

  if (!status.isActive) {
    return (
      <Link href="/billing" className="block px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0">
            <div className="font-medium">Expired</div>
            <div className="truncate">Upgrade now</div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href="/billing" className="block px-3 py-2">
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
        <Crown className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="font-medium truncate">{status.planName} Plan</span>
      </div>
    </Link>
  );
}
