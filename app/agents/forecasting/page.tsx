import { Gauge } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ForecastingAgentPage() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="rounded-full bg-primary/10 p-6">
                <Gauge className="h-16 w-16 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="font-bold text-3xl">Forecasting Agent</h1>
                <p className="text-muted-foreground text-xl">Coming Soon...</p>
              </div>
              <p className="max-w-md text-muted-foreground">
                Scenario modelling, runway projections and automated assumption
                tracking with AI workflows will be available soon.
              </p>
              <div className="flex gap-3 pt-4">
                <Button asChild variant="default">
                  <Link href="/agents">View other agents</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">Back to home</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
