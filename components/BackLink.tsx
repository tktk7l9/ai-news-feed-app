import Link from "next/link";

// Consistent escape hatch on every subpage; the PWA runs standalone without a browser back button
// (SHIG 60, 82, 6). min-h-11 keeps the touch target at 44px (SHIG 78).
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex items-center min-h-11 -ml-2 px-2 text-sm text-neutral-600 hover:text-foreground dark:text-neutral-400 rounded"
    >
      <span aria-hidden="true" className="mr-1">←</span>
      {children}
    </Link>
  );
}
