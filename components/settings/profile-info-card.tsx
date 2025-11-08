import type { UserSettings } from "@/app/(settings)/api/user/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileInfoCard({ data }: { data: UserSettings }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              className="bg-muted"
              disabled
              id="firstName"
              placeholder="Enter first name"
              value={data.personalisation.firstName}
            />
            <p className="text-muted-foreground text-xs">
              Go to Manage account to update.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              className="bg-muted"
              disabled
              id="lastName"
              placeholder="Enter last name"
              value={data.personalisation.lastName}
            />
            <p className="text-muted-foreground text-xs">
              Go to Manage account to update.
            </p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input
              className="bg-muted"
              disabled
              id="email"
              placeholder="you@example.com"
              type="email"
              value={data.email}
            />
            <p className="text-muted-foreground text-xs">
              Go to Manage account to update.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
