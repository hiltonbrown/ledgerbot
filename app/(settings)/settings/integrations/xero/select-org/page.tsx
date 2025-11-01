import { redirect } from "next/navigation";
import { XeroOrganizationCard } from "@/components/settings/xero-organization-card";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getXeroConnectionsByUserId } from "@/lib/db/queries";

export default async function XeroSelectOrgPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const connections = await getXeroConnectionsByUserId(user.id);

  if (connections.length === 0) {
    redirect("/settings/integrations?error=no_xero_connection");
  }

  // Removed automatic redirect for single connection to allow users to view/select their organization

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-bold text-3xl">Select Xero Organization</h1>
        <p className="mt-2 text-muted-foreground">
          Choose which Xero organization to use with LedgerBot. You can switch
          between organizations at any time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {connections.map((connection) => (
          <XeroOrganizationCard connection={connection} key={connection.id} />
        ))}
      </div>
    </div>
  );
}
