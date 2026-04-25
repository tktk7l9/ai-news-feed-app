import { Feed } from "feed";
import { tryGetServiceClient } from "@/lib/supabase/server";
import type { Article } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  const appUrl = process.env.APP_URL ?? "https://ai-news-feed-app.example.com";
  const sb = tryGetServiceClient();
  let articles: Article[] = [];
  if (sb) {
    const { data } = await sb
      .from("articles")
      .select("*")
      .order("digest_date", { ascending: false })
      .order("importance", { ascending: false })
      .limit(100);
    articles = (data ?? []) as Article[];
  }

  const feed = new Feed({
    title: "AIニュース・ダイジェスト",
    description: "毎朝7時(JST)更新のAI関連トピック日本語ダイジェスト",
    id: appUrl,
    link: appUrl,
    language: "ja",
    favicon: `${appUrl}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}`,
    feedLinks: { rss2: `${appUrl}/feed.xml` },
  });

  for (const a of articles) {
    feed.addItem({
      title: a.title_ja,
      id: a.url,
      link: a.url,
      description: a.summary_ja,
      content: a.summary_ja,
      date: a.published_at ? new Date(a.published_at) : new Date(`${a.digest_date}T07:00:00+09:00`),
      category: [{ name: CATEGORY_LABELS[a.category] ?? a.category }],
      author: [{ name: a.source_name }],
    });
  }

  return new Response(feed.rss2(), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
