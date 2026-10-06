// Matched as lowercase substrings, so keep each term long enough not to hide inside
// unrelated words (e.g. "tpu" would match "output").
const AI_KEYWORDS = [
  // English: concepts
  "ai", "a.i.", "artificial intelligence", "machine learning", "deep learning",
  "neural", "llm", "large language model", "foundation model", "generative ai",
  "transformer", "diffusion", "agent", "agentic", "rag", "embedding", "fine-tun",
  "inference", "model", "reasoning model", "multimodal", "chatbot", "vibe coding",
  "mcp", "model context protocol", "gpu",
  // English: labs and vendors
  "openai", "anthropic", "deepmind", "mistral", "deepseek", "hugging face",
  "nvidia", "xai", "perplexity", "elevenlabs",
  // English: models and products
  "gpt", "chatgpt", "codex", "claude", "gemini", "gemma", "notebooklm", "veo",
  "llama", "qwen", "kimi", "grok", "copilot", "stable diffusion", "midjourney",
  "dall-e", "sora", "alphafold",
  // Japanese
  "人工知能", "機械学習", "深層学習", "ディープラーニング", "ニューラル", "生成ai",
  "言語モデル", "基盤モデル", "推論モデル", "マルチモーダル", "エージェント",
  "チャットボット", "画像生成", "動画生成", "強化学習", "自然言語処理",
];

const lower = AI_KEYWORDS.map((k) => k.toLowerCase());

/** True when the title or body mentions one of AI_KEYWORDS. The ordering and caps live in lib/jobs/candidates.ts. */
export function isAIRelated(article: { title: string; raw_content: string | null }): boolean {
  const haystack = `${article.title} ${article.raw_content ?? ""}`.toLowerCase();
  return lower.some((k) => haystack.includes(k));
}
