import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProfileInfoCard({ data }: { data: UserSettings }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Profile & Account</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href="/account">
            Manage Account
            <ExternalLink className="ml-2 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <p className="font-medium text-sm">Name</p>
              <p className="text-muted-foreground text-xs">
                Your full name from Clerk authentication
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">
                {data.personalisation.firstName} {data.personalisation.lastName}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <p className="font-medium text-sm">Email</p>
              <p className="text-muted-foreground text-xs">
                Your email address for authentication
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{data.email}</p>
            </div>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Managed by Clerk</Badge>
              <p className="text-muted-foreground text-xs">
                Update your profile information in your Clerk account settings
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
