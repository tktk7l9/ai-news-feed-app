export const CATEGORIES = [
  "llm",
  "image",
  "research",
  "product",
  "business",
  "tool",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  llm: "LLM・基盤モデル",
  image: "画像・動画生成",
  research: "研究・論文",
  product: "プロダクト",
  business: "業界・ビジネス",
  tool: "ツール・開発",
  other: "その他",
};

export type Article = {
  id: string;
  digest_date: string;
  title_ja: string;
  summary_ja: string;
  category: Category;
  importance: number;
  url: string;
  source_name: string;
  published_at: string | null;
  is_model_release: boolean;
};

export type DailyDigest = {
  date: string;
  overview_ja: string;
  article_count: number;
  generated_at: string;
};

export type Source = {
  id: string;
  name: string;
  feed_url: string;
  weight: number;
  is_active: boolean;
};

export type RawArticle = {
  id: string;
  source_id: string;
  url: string;
  title: string;
  raw_content: string | null;
  published_at: string | null;
  source_name?: string;
  source_weight?: number;
};
