"use client";

import { UserProfile } from "@clerk/nextjs";
import { useTheme } from "next-themes";

export default function AccountPage() {
  const { theme } = useTheme();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <UserProfile
        appearance={{
          baseTheme: (theme === "dark" ? "dark" : "light") as any,
        }}
      />
    </div>
  );
}
