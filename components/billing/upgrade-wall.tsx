"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";
import Link from "next/link";

type UpgradeWallProps = {
  reason: string;
  children: React.ReactNode;
  isBlocked: boolean;
};

export function UpgradeWall({ reason, children, isBlocked }: UpgradeWallProps) {
  if (!isBlocked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-50">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-6 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Upgrade Required</h3>
              <p className="text-sm text-muted-foreground mt-1">{reason}</p>
            </div>
            <Button asChild>
              <Link href="/billing">View Plans</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
