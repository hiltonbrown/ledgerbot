import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: "4xl" | "6xl" | "7xl";
  className?: string;
}

export function PageContainer({
  children,
  maxWidth = "6xl",
  className = "",
}: PageContainerProps) {
  const widthClass = {
    "4xl": "max-w-4xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
  }[maxWidth];

  return (
    <div className={`mx-auto w-full ${widthClass} space-y-8 ${className}`}>
      {children}
    </div>
  );
}
