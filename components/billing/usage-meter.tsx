"use client";

import type { UsageInfo } from "@/lib/api/subscriptions";

function MeterBar({ label, current, max }: { label: string; current: number; max: number }) {
  const isUnlimited = max === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((current / max) * 100));
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && current >= max;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${isAtLimit ? "text-red-600 dark:text-red-400" : isNearLimit ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
          {current} / {isUnlimited ? "Unlimited" : max}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isAtLimit ? "bg-red-500" : isNearLimit ? "bg-yellow-500" : "bg-primary"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function UsageMeter({ usage }: { usage: UsageInfo }) {
  return (
    <div className="space-y-4">
      <MeterBar label="Team Members" current={usage.currentUsers} max={usage.limits.maxUsers} />
      <MeterBar label="Projects" current={usage.currentProjects} max={usage.limits.maxProjects} />
      <MeterBar label="Workspaces" current={usage.currentWorkspaces} max={usage.limits.maxWorkspaces} />
    </div>
  );
}
