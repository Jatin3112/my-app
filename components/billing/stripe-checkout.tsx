"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type StripeCheckoutProps = {
  planSlug: string;
  planName: string;
  workspaceId: string;
  priceDisplay: string;
  disabled?: boolean;
  variant?: "default" | "outline";
  onSuccess?: () => void;
};

export function StripeCheckout({
  planSlug,
  workspaceId,
  priceDisplay,
  disabled = false,
  variant = "default",
}: StripeCheckoutProps) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug, workspaceId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to create checkout session");
        return;
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      console.error("Stripe checkout error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      className="w-full"
      variant={variant}
      disabled={disabled || loading}
      onClick={handleCheckout}
    >
      {loading ? "Processing..." : disabled ? "Current Plan" : "Upgrade"}
    </Button>
  );
}
