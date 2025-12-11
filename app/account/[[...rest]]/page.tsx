"use client";

import { UserProfile } from "@clerk/nextjs";

import { clerkAppearance } from "@/lib/clerk/appearance";

export default function AccountPage() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <UserProfile appearance={clerkAppearance} />
    </div>
  );
}
