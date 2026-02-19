"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function BillingSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => router.push("/billing"), 5000);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <AppShell>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your subscription is now active. You&apos;ll be redirected to the billing page shortly.
            </p>
            <Button onClick={() => router.push("/billing")}>
              Go to Billing
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
