"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Header link that shows where the reader is (SHIG 59, 25).
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const current = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={current ? "page" : undefined}
      className={[
        "inline-flex items-center min-h-11 px-2 rounded whitespace-nowrap transition-colors hover:text-foreground",
        current ? "font-semibold text-foreground underline underline-offset-4 decoration-2 decoration-amber-600" : "",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
