"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type RazorpayCheckoutProps = {
  planSlug: string;
  planName: string;
  workspaceId: string;
  priceDisplay: string;
  disabled?: boolean;
  variant?: "default" | "outline";
  onSuccess?: () => void;
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function RazorpayCheckout({
  planSlug,
  planName,
  workspaceId,
  priceDisplay,
  disabled = false,
  variant = "default",
  onSuccess,
}: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load payment gateway");
        return;
      }

      const res = await fetch("/api/payments/razorpay/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug, workspaceId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to create subscription");
        return;
      }

      const { subscriptionId } = await res.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: subscriptionId,
        name: "VoiceTask",
        description: `${planName} Plan — ${priceDisplay}`,
        handler: () => {
          toast.success("Payment successful! Your plan is now active.");
          onSuccess?.();
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled");
          },
        },
        theme: { color: "#6366f1" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      console.error("Checkout error:", err);
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
