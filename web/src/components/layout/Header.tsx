"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/studio", label: "Studio", short: "Studio" },
  { href: "/explore", label: "Explore", short: "Explore" },
  { href: "/about", label: "How beams fail", short: "Learn" },
];

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  // false during the server render, true once hydrated (avoids a theme-label mismatch)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <header className="sticky top-0 z-40 h-14 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-3 px-4 lg:gap-8 lg:px-6">
        <Link href="/" className="whitespace-nowrap text-[14px] font-bold tracking-tight lg:text-[15px]">
          RC Beam<span className="text-accent"> Fire</span>
          <span className="hidden sm:inline"> Studio</span>
        </Link>

        <nav className="flex items-center gap-0.5 lg:gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors lg:px-3.5 lg:text-sm",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="lg:hidden">{item.short}</span>
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="ml-auto hidden rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
        >
          {mounted ? (resolvedTheme === "dark" ? "Light" : "Dark") : "Theme"}
        </button>
      </div>
    </header>
  );
}
