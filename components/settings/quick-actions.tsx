import Link from "next/link";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QuickAction = {
  label: string;
  href: string;
  description: string;
  icon?: React.ReactNode;
};

type QuickActionsProps = {
  actions: QuickAction[];
};

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {actions.map((action) => (
            <Button
              asChild
              className="h-auto justify-start p-4 text-left"
              key={action.href}
              variant="outline"
            >
              <Link href={action.href}>
                <div className="flex w-full items-start gap-3">
                  {action.icon ? (
                    <div className="shrink-0 pt-0.5">{action.icon}</div>
                  ) : null}
                  <div className="flex-1 space-y-1">
                    <div className="font-medium text-sm">{action.label}</div>
                    <div className="text-muted-foreground text-xs leading-relaxed">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
