"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const settingsLinks = [
  { href: "/settings", label: "Overview" },
  { href: "/settings/personalisation", label: "Personalisation" },
  { href: "/settings/usage", label: "Usage" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/agents", label: "Agents" },
  { href: "/settings/chartofaccounts", label: "Chart of Accounts" },
];

export function SettingsSubnav() {
  const pathname = usePathname();

  return (
    <div className="border-b bg-background">
      <nav className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 py-2">
          {settingsLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <li key={link.href}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-full items-center justify-center rounded-lg px-3 py-2 font-semibold text-sm transition-colors",
                    "border border-transparent bg-muted/50 hover:bg-muted",
                    isActive
                      ? "border-primary/70 bg-primary/10 text-foreground"
                      : "text-muted-foreground"
                  )}
                  href={link.href}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
