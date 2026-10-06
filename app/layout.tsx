import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { FooterUpdatedAt } from "@/components/FooterUpdatedAt";
import { NavLink } from "@/components/NavLink";
import "./globals.css";

// Already moved to Cloudflare Workers. The whole Vercel account is down with 402, so
// defaulting to the old URL would point the OGP image and canonical at a dead page.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-news-feed-app.saitotakuya0719.workers.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AIニュース・ダイジェスト",
    template: "%s | AIニュース・ダイジェスト",
  },
  description: "毎朝6時(JST)に更新する、AI関連トピックの日本語ダイジェスト。最新のAI研究・モデルリリース・業界動向を毎日お届けします。",
  keywords: ["AI", "人工知能", "ニュース", "ダイジェスト", "機械学習", "LLM", "大規模言語モデル"],
  authors: [{ name: "AI News Digest" }],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName: "AIニュース・ダイジェスト",
    title: "AIニュース・ダイジェスト",
    description: "毎朝6時(JST)に更新する、AI関連トピックの日本語ダイジェスト。",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIニュース・ダイジェスト",
    description: "毎朝6時(JST)に更新する、AI関連トピックの日本語ダイジェスト。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d97706" },
    { media: "(prefers-color-scheme: dark)", color: "#92400e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col text-foreground bg-radial-warm">
        {/* Skip link for keyboard users (SHIG 94) */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50
                     focus:rounded-md focus:bg-background focus:px-4 focus:py-3 focus:text-sm focus:shadow-lg"
        >
          本文へスキップ
        </a>
        <header className="relative z-10 border-b border-black/8 dark:border-white/8 backdrop-blur-sm bg-background/80">
          {/* Wraps instead of overflowing when text is enlarged (SHIG 95) */}
          <div className="max-w-3xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-x-4">
            <Link href="/" prefetch={false} className="inline-flex flex-wrap items-baseline gap-x-1 min-h-11 py-2 font-semibold text-lg tracking-tight rounded">
              <span>AI News<span className="text-amber-600 dark:text-amber-400" aria-hidden="true"> ·</span></span>
              <span className="text-sm font-normal text-neutral-600 dark:text-neutral-400">日本語ダイジェスト</span>
            </Link>
            <nav aria-label="メイン" className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <NavLink href="/archive">アーカイブ</NavLink>
            </nav>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="relative z-10 flex-1 focus:outline-none">{children}</main>
        <footer className="relative z-10 border-t border-black/8 dark:border-white/8 mt-12 backdrop-blur-sm bg-background/60">
          <div className="max-w-3xl mx-auto px-4 py-6 text-xs text-neutral-600 dark:text-neutral-400 flex flex-wrap justify-between gap-x-4 gap-y-1">
            <span>© AI News Digest</span>
            <FooterUpdatedAt />
          </div>
        </footer>
        {/* Cloudflare Web Analytics (the token is a public identifier, not a secret) */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts --
            type="module" scripts are deferred by spec, so this does not block the parser */}
        <script
          type="module"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={'{"token": "cd156fbf0fd24da0a12e58fdb4e63828"}'}
        />
      </body>
    </html>
  );
}
