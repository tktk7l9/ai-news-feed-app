import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { WebGLBackground } from "@/components/WebGLBackground";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AIニュース・ダイジェスト",
  description: "毎朝7時(JST)に更新する、AI関連トピックの日本語ダイジェスト。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-foreground">
        <WebGLBackground />
        <header className="relative z-10 border-b border-black/8 dark:border-white/8 backdrop-blur-sm bg-background/80">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="font-semibold text-lg tracking-tight">
              AI News<span className="text-indigo-500"> ·</span>{" "}
              <span className="text-sm font-normal text-neutral-500">日本語ダイジェスト</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
              <Link href="/archive" className="hover:text-foreground transition-colors">アーカイブ</Link>
            </nav>
          </div>
        </header>
        <main className="relative z-10 flex-1">{children}</main>
        <footer className="relative z-10 border-t border-black/8 dark:border-white/8 mt-12 backdrop-blur-sm bg-background/60">
          <div className="max-w-3xl mx-auto px-4 py-6 text-xs text-neutral-400 flex justify-between">
            <span>© AI News Digest</span>
            <span>JST 07:00 更新</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
