import { UserProfile } from "@clerk/nextjs";

export default function UserSettingsPage() {
  return (
    <div className="flex items-center justify-center">
      <UserProfile
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-background shadow-none border-0 w-full",
            navbar: "hidden",
            pageScrollBox: "p-0",
            headerTitle: "text-foreground text-2xl font-semibold",
            headerSubtitle: "text-muted-foreground text-sm",
            formButtonPrimary:
              "bg-primary text-primary-foreground hover:bg-primary/90",
            formFieldInput: "bg-muted border-border text-foreground",
            formFieldLabel: "text-foreground text-sm font-medium",
            accordionTriggerButton: "text-foreground hover:bg-muted",
            breadcrumbsItem: "text-muted-foreground",
            breadcrumbsItemDivider: "text-muted-foreground",
            profileSection: "border-border",
            profileSectionTitle: "text-foreground font-semibold",
            profileSectionContent: "text-muted-foreground",
            badge: "bg-muted text-foreground",
            avatarBox: "border-border",
          },
        }}
      />
    </div>
  );
}
