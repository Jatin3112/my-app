"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useWorkspace } from "@/hooks/use-workspace";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UsageMeter } from "@/components/billing/usage-meter";
import { getWorkspaceSubscriptionStatus, getUsageInfo, getAllPlans } from "@/lib/api/subscriptions";
import type { UsageInfo } from "@/lib/api/subscriptions";
import type { Plan } from "@/lib/db/schema";
import { Crown, Check } from "lucide-react";

export default function BillingPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const { currentWorkspace } = useWorkspace();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [subStatus, setSubStatus] = useState<{
    isActive: boolean;
    status: string;
    planName: string;
    trialDaysRemaining: number;
    isTrialing: boolean;
  } | null>(null);
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace?.id || !userId) return;
    Promise.all([
      getWorkspaceSubscriptionStatus(currentWorkspace.id),
      getUsageInfo(currentWorkspace.id, userId),
      getAllPlans(),
    ]).then(([status, usageData, planList]) => {
      setSubStatus({ ...status, planName: status.plan?.name ?? "No Plan" });
      setUsage(usageData);
      setPlans(planList);
      setLoading(false);
    });
  }, [currentWorkspace?.id, userId]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8 p-6">
        <div>
          <h1 className="text-2xl font-bold">Billing & Plans</h1>
          <p className="text-muted-foreground">Manage your subscription and usage</p>
        </div>

        {/* Current Plan Status */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              {subStatus?.isTrialing
                ? `Free trial — ${subStatus.trialDaysRemaining} days remaining`
                : subStatus?.isActive
                  ? "Your subscription is active"
                  : "Your subscription has expired"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-6">
              <Crown className="h-8 w-8 text-primary" />
              <div>
                <div className="text-xl font-bold">{subStatus?.planName}</div>
                <Badge variant={subStatus?.isActive ? "default" : "destructive"}>
                  {subStatus?.status === "trialing" ? "Trial" : subStatus?.status}
                </Badge>
              </div>
            </div>
            {usage && <UsageMeter usage={usage} />}
          </CardContent>
        </Card>

        {/* Plan Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Choose a Plan</h2>
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <button
                onClick={() => setCurrency("INR")}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${currency === "INR" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                INR
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${currency === "USD" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                USD
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = subStatus?.planName === plan.name;
              const price = currency === "INR" ? plan.price_inr : plan.price_usd;
              const symbol = currency === "INR" ? "₹" : "$";
              const features = (plan.features as string[]) ?? [];

              return (
                <Card key={plan.id} className={`relative ${isCurrent ? "border-primary ring-2 ring-primary/20" : ""}`}>
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge>Current Plan</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-foreground">{symbol}{price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{plan.max_users === -1 ? "Unlimited" : plan.max_users} user{plan.max_users !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{plan.max_projects === -1 ? "Unlimited" : plan.max_projects} project{plan.max_projects !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{plan.max_workspaces === -1 ? "Unlimited" : plan.max_workspaces} workspace{plan.max_workspaces !== 1 ? "s" : ""}</span>
                      </div>
                      {features.map((f) => (
                        <div key={f} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{f.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent}
                    >
                      {isCurrent ? "Current Plan" : "Upgrade"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Payment History Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Your billing history will appear here once you subscribe.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
