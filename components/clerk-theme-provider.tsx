"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { clerkAppearance } from "@/lib/clerk/appearance";

type ClerkThemeProviderProps = {
  children: ReactNode;
};

export function ClerkThemeProvider({ children }: ClerkThemeProviderProps) {
  // Use CSS variables that automatically adapt to the current theme
  // Note: We rely on CSS custom properties that change with the .dark class
  // so we don't need to access resolvedTheme from useTheme
  const appearance = {
    layout: {
      termsPageUrl: "https://ledgerbot.co/terms",
      privacyPageUrl: "https://ledgerbot.co/privacy",
    },
    ...clerkAppearance,
  };

  return <ClerkProvider appearance={appearance}>{children}</ClerkProvider>;
}
