"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { RazorpayCheckout } from "./razorpay-checkout";
import { StripeCheckout } from "./stripe-checkout";
import type { Plan } from "@/lib/db/schema";

type PricingCardsProps = {
  plans: Plan[];
  currentPlanName: string | null;
  currency: "INR" | "USD";
  workspaceId: string;
  onSubscriptionChange?: () => void;
};

export function PricingCards({
  plans,
  currentPlanName,
  currency,
  workspaceId,
  onSubscriptionChange,
}: PricingCardsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => {
        const isCurrent = currentPlanName === plan.name;
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
              {currency === "INR" ? (
                <RazorpayCheckout
                  planSlug={plan.slug}
                  planName={plan.name}
                  workspaceId={workspaceId}
                  priceDisplay={`${symbol}${price}/mo`}
                  disabled={isCurrent}
                  variant={isCurrent ? "outline" : "default"}
                  onSuccess={onSubscriptionChange}
                />
              ) : (
                <StripeCheckout
                  planSlug={plan.slug}
                  planName={plan.name}
                  workspaceId={workspaceId}
                  priceDisplay={`${symbol}${price}/mo`}
                  disabled={isCurrent}
                  variant={isCurrent ? "outline" : "default"}
                  onSuccess={onSubscriptionChange}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
