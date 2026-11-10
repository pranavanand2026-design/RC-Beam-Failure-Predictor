"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/studio", label: "Studio" },
  { href: "/explore", label: "Explore" },
  { href: "/about", label: "How beams fail" },
];

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-40 h-14 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-8 px-6">
        <Link href="/" className="text-[15px] font-bold tracking-tight">
          RC Beam<span className="text-accent"> Fire</span> Studio
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="ml-auto rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {mounted ? (resolvedTheme === "dark" ? "Light" : "Dark") : "Theme"}
        </button>
      </div>
    </header>
  );
}
