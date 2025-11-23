import type { ReactNode } from "react";

interface SettingsLayoutProps {
  children: ReactNode;
  maxWidth?: "4xl" | "6xl" | "7xl";
}

/**
 * Standard layout wrapper for pages in the (settings) route group.
 * Provides consistent container and spacing.
 *
 * Usage:
 * ```tsx
 * <SettingsLayout>
 *   <PageHeader icon={Sparkles} title="Settings" description="..." />
 *   <YourContent />
 * </SettingsLayout>
 * ```
 */
export function SettingsLayout({
  children,
  maxWidth = "6xl",
}: SettingsLayoutProps) {
  const widthClass = {
    "4xl": "max-w-4xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
  }[maxWidth];

  return (
    <div className={`container mx-auto space-y-6 p-6 ${widthClass}`}>
      {children}
    </div>
  );
}
