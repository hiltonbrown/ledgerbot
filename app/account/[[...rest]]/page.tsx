"use client";

import { UserProfile } from "@clerk/nextjs";

export default function AccountPage() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <UserProfile />
    </div>
  );
}
