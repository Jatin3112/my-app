"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useWorkspace } from "@/hooks/use-workspace";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UsageMeter } from "@/components/billing/usage-meter";
import { PricingCards } from "@/components/billing/pricing-cards";
import { getWorkspaceSubscriptionStatus, getUsageInfo, getAllPlans, getPaymentHistory } from "@/lib/api/subscriptions";
import type { UsageInfo } from "@/lib/api/subscriptions";
import type { Plan, PaymentRecord } from "@/lib/db/schema";
import { Crown } from "lucide-react";

export default function BillingPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { currentWorkspace } = useWorkspace();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [subStatus, setSubStatus] = useState<{
    isActive: boolean;
    status: string;
    planName: string;
    trialDaysRemaining: number;
    isTrialing: boolean;
  } | null>(null);
  const [currency, setCurrency] = useState<"INR" | "USD">(() => {
    if (typeof navigator !== "undefined") {
      const locale = navigator.language || "";
      if (locale.endsWith("-IN") || locale === "hi") return "INR";
    }
    return "USD";
  });
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!currentWorkspace?.id || !userId) return;
    setLoading(true);
    const [status, usageData, planList, paymentList] = await Promise.all([
      getWorkspaceSubscriptionStatus(currentWorkspace.id),
      getUsageInfo(currentWorkspace.id, userId),
      getAllPlans(),
      getPaymentHistory(currentWorkspace.id),
    ]);
    setSubStatus({ ...status, planName: status.plan?.name ?? "No Plan" });
    setUsage(usageData);
    setPlans(planList);
    setPayments(paymentList as PaymentRecord[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
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

          <PricingCards
            plans={plans}
            currentPlanName={subStatus?.planName ?? null}
            currency={currency}
            workspaceId={currentWorkspace?.id ?? ""}
            onSubscriptionChange={loadData}
          />
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              {payments.length > 0
                ? "Your recent transactions"
                : "Your billing history will appear here once you subscribe."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <div className="text-sm font-medium">{p.description ?? "Payment"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {p.currency === "INR" ? "₹" : "$"}
                        {(p.amount / 100).toFixed(2)}
                      </div>
                      <Badge variant={p.status === "captured" ? "default" : "secondary"} className="text-xs">
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
