import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AIニュース・ダイジェスト",
  description: "毎朝7時(JST)に更新する、AI関連トピックの日本語ダイジェスト。",
  alternates: {
    types: { "application/rss+xml": "/feed.xml" },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-black/10 dark:border-white/10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="font-semibold text-lg">
              AI News<span className="text-indigo-500"> ·</span>{" "}
              <span className="text-sm font-normal text-neutral-500">日本語ダイジェスト</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-300">
              <Link href="/archive" className="hover:text-foreground">アーカイブ</Link>
              <Link href="/subscribe" className="hover:text-foreground">購読</Link>
              <a href="/feed.xml" className="hover:text-foreground">RSS</a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-black/10 dark:border-white/10 mt-12">
          <div className="max-w-3xl mx-auto px-4 py-6 text-xs text-neutral-500 flex justify-between">
            <span>© AI News Digest</span>
            <span>JST 07:00 更新</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
