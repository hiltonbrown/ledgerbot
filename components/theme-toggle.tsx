"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const themeToggleLabel = isMounted
    ? resolvedTheme === "dark"
      ? "Switch to light mode"
      : "Switch to dark mode"
    : "Toggle theme";

  const themeToggleIcon = useMemo(() => {
    if (!isMounted) {
      return <Moon className="size-4" />;
    }

    return resolvedTheme === "dark" ? (
      <Sun className="size-4" />
    ) : (
      <Moon className="size-4" />
    );
  }, [isMounted, resolvedTheme]);

  const handleThemeToggle = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  return (
    <Button
      aria-label={themeToggleLabel}
      className="h-8 w-8 md:h-9 md:w-9"
      disabled={!isMounted}
      onClick={handleThemeToggle}
      size="icon"
      variant="ghost"
    >
      {themeToggleIcon}
      <span className="sr-only">{themeToggleLabel}</span>
    </Button>
  );
}
