"use client";

import { UserProfile } from "@clerk/nextjs";
import { useTheme } from "next-themes";

export default function AccountPage() {
  const { theme } = useTheme();

  return (
    <div className="flex h-full w-full items-center justify-center">
      <UserProfile
        appearance={{
          baseTheme: (theme === "dark" ? "dark" : "light") as any,
        }}
      />
    </div>
  );
}
