import type { Article, DailyDigest } from "@/lib/types";

export function article(overrides: Partial<Article> = {}): Article {
  return {
    id: "a1",
    digest_date: "2026-09-30",
    title_ja: "新しいモデルが公開された",
    summary_ja: "要約テキスト",
    category: "llm",
    importance: 4,
    url: "https://example.com/post",
    source_name: "Example Blog",
    published_at: "2026-09-29T10:00:00Z",
    is_model_release: false,
    ...overrides,
  };
}

export function digest(overrides: Partial<DailyDigest> = {}): DailyDigest {
  return {
    date: "2026-09-30",
    overview_ja: "今日は3件のニュースがありました。",
    article_count: 3,
    generated_at: "2026-09-29T21:00:00Z",
    ...overrides,
  };
}
