import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { FooterUpdatedAt } from "@/components/FooterUpdatedAt";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-news-feed-app.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AIニュース・ダイジェスト",
    template: "%s | AIニュース・ダイジェスト",
  },
  description: "1日2回(JST 6時・18時)に更新する、AI関連トピックの日本語ダイジェスト。最新のAI研究・モデルリリース・業界動向を毎日お届けします。",
  keywords: ["AI", "人工知能", "ニュース", "ダイジェスト", "機械学習", "LLM", "大規模言語モデル"],
  authors: [{ name: "AI News Digest" }],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName: "AIニュース・ダイジェスト",
    title: "AIニュース・ダイジェスト",
    description: "1日2回(JST 6時・18時)に更新する、AI関連トピックの日本語ダイジェスト。",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIニュース・ダイジェスト",
    description: "1日2回(JST 6時・18時)に更新する、AI関連トピックの日本語ダイジェスト。",
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
        <header className="relative z-10 border-b border-black/8 dark:border-white/8 backdrop-blur-sm bg-background/80">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" prefetch={false} className="font-semibold text-lg tracking-tight">
              AI News<span className="text-amber-600 dark:text-amber-400" aria-hidden="true"> ·</span>{" "}
              <span className="text-sm font-normal text-neutral-600 dark:text-neutral-400">日本語ダイジェスト</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
              <Link href="/archive" prefetch={false} className="hover:text-foreground transition-colors">アーカイブ</Link>
            </nav>
          </div>
        </header>
        <main className="relative z-10 flex-1">{children}</main>
        <footer className="relative z-10 border-t border-black/8 dark:border-white/8 mt-12 backdrop-blur-sm bg-background/60">
          <div className="max-w-3xl mx-auto px-4 py-6 text-xs text-neutral-600 dark:text-neutral-400 flex justify-between">
            <span>© AI News Digest</span>
            <FooterUpdatedAt />
          </div>
        </footer>
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  );
}
