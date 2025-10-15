"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/settings", label: "Overview" },
  { href: "/settings/personalisation", label: "Personalisation" },
  { href: "/settings/usage", label: "Usage" },
  { href: "/settings/files", label: "Files" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/agents", label: "Agents" },
];

const labelsByPath: Record<string, string> = {
  "/settings": "Settings",
  "/settings/personalisation": "Personalisation",
  "/settings/usage": "Usage Tracking",
  "/settings/files": "File Management",
  "/settings/integrations": "Integration Settings",
  "/settings/agents": "Agent Configuration",
};

export function SettingsHeader() {
  const pathname = usePathname();
  const activeLink =
    [...links]
      .sort((a, b) => b.href.length - a.href.length)
      .find((link) => pathname.startsWith(link.href)) ?? links[0];
  const activeLabel = labelsByPath[activeLink.href];

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
          <li>
            <Link className="transition-colors hover:text-foreground" href="/">
              Home
            </Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li>
            <Link
              className={cn(
                "transition-colors",
                pathname === "/settings"
                  ? "text-foreground"
                  : "hover:text-foreground"
              )}
              href="/settings"
            >
              Settings
            </Link>
          </li>
          {activeLink.href !== "/settings" ? (
            <>
              <li className="text-muted-foreground">/</li>
              <li className="font-medium text-foreground">{activeLabel}</li>
            </>
          ) : null}
        </ol>
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        {links.map((link) => {
          const isActive = pathname === link.href;

          return (
            <Link
              className={cn(
                "rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl text-foreground tracking-tight">
          {activeLabel}
        </h1>
        <p className="text-muted-foreground text-sm">
          Configure workspace behavior, manage collaborators, and monitor usage
          in one place.
        </p>
      </div>
    </div>
  );
}
