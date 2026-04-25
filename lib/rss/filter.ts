import type { RawArticle } from "@/lib/types";

const AI_KEYWORDS = [
  // English
  "ai", "a.i.", "artificial intelligence", "machine learning", "deep learning",
  "neural", "llm", "large language model", "gpt", "chatgpt", "openai",
  "anthropic", "claude", "gemini", "mistral", "llama", "transformer",
  "diffusion", "stable diffusion", "midjourney", "dall-e", "sora",
  "agent", "rag", "embedding", "fine-tun", "inference", "model",
  "hugging face", "nvidia", "deepmind",
  // Japanese
  "人工知能", "機械学習", "深層学習", "生成ai", "言語モデル", "基盤モデル",
];

const lower = AI_KEYWORDS.map((k) => k.toLowerCase());

export function isAIRelated(article: { title: string; raw_content: string | null }): boolean {
  const haystack = `${article.title} ${article.raw_content ?? ""}`.toLowerCase();
  return lower.some((k) => haystack.includes(k));
}

export function filterAndCap<T extends { title: string; raw_content: string | null }>(
  articles: T[],
  cap = 60,
): T[] {
  return articles.filter(isAIRelated).slice(0, cap);
}
