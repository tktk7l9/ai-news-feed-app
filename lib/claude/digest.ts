import { getAnthropic, CLAUDE_MODEL, CLAUDE_HAIKU_MODEL } from "./client";
import {
  FILTER_SYSTEM_PROMPT,
  FILTER_TOOL_SPEC,
  SUMMARIZE_SYSTEM_PROMPT,
  SUMMARIZE_TOOL_SPEC,
} from "./prompts";
import type { Category } from "@/lib/types";

export type DigestInput = {
  raw_id: string;
  source_name: string;
  title: string;
  url: string;
  raw_content: string | null;
};

export type DigestArticleResult = {
  raw_id: string;
  should_include: boolean;
  title_ja: string;
  summary_ja: string;
  category: Category;
  importance: number;
  is_model_release: boolean;
};

export type DigestResult = {
  overview_ja: string;
  articles: DigestArticleResult[];
};

type FilterArticle = {
  raw_id: string;
  should_include: boolean;
  category: Category;
  importance: number;
  is_model_release: boolean;
};

type SummarizeArticle = {
  raw_id: string;
  title_ja: string;
  summary_ja: string;
};

export async function generateDigest(inputs: DigestInput[]): Promise<DigestResult> {
  if (inputs.length === 0) {
    return { overview_ja: "本日は特筆すべきAIニュースがありませんでした。", articles: [] };
  }

  const anthropic = getAnthropic();

  // Stage 1: classify all articles with Haiku (short excerpts, cheap)
  const filterPayload = inputs.map((i) => ({
    raw_id: i.raw_id,
    source: i.source_name,
    title: i.title,
    excerpt: (i.raw_content ?? "").slice(0, 500),
  }));

  const filterRes = await withRetry(() =>
    anthropic.messages.create({
      model: CLAUDE_HAIKU_MODEL,
      max_tokens: 4096,
      system: [{ type: "text", text: FILTER_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [FILTER_TOOL_SPEC],
      tool_choice: { type: "tool", name: FILTER_TOOL_SPEC.name },
      messages: [
        {
          role: "user",
          content: `以下の記事を分類してください。\n\n${JSON.stringify(filterPayload, null, 2)}`,
        },
      ],
    }),
  );

  const filterTool = filterRes.content.find((b) => b.type === "tool_use");
  if (!filterTool || filterTool.type !== "tool_use") {
    throw new Error("Stage 1: Claude response did not include a tool_use block");
  }
  const classifications = ((filterTool.input as { articles?: FilterArticle[] }).articles ?? []);

  // Stage 2: summarize only accepted articles with Sonnet
  const accepted = classifications
    .filter((c) => c.should_include && c.importance >= 3)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 15);

  if (accepted.length === 0) {
    return {
      overview_ja: "本日は特筆すべきAIニュースがありませんでした。",
      articles: classifications.map((c) => ({ ...c, title_ja: "", summary_ja: "", is_model_release: c.is_model_release ?? false })),
    };
  }

  const inputMap = new Map(inputs.map((i) => [i.raw_id, i]));
  const summarizePayload = accepted.map((c) => {
    const src = inputMap.get(c.raw_id);
    return {
      raw_id: c.raw_id,
      source: src?.source_name ?? "",
      title: src?.title ?? "",
      url: src?.url ?? "",
      excerpt: (src?.raw_content ?? "").slice(0, 1500),
    };
  });

  const summarizeRes = await withRetry(() =>
    anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: [{ type: "text", text: SUMMARIZE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [SUMMARIZE_TOOL_SPEC],
      tool_choice: { type: "tool", name: SUMMARIZE_TOOL_SPEC.name },
      messages: [
        {
          role: "user",
          content: `以下の記事を日本語で要約し、総括を生成してください。\n\n${JSON.stringify(summarizePayload, null, 2)}`,
        },
      ],
    }),
  );

  const summarizeTool = summarizeRes.content.find((b) => b.type === "tool_use");
  if (!summarizeTool || summarizeTool.type !== "tool_use") {
    throw new Error("Stage 2: Claude response did not include a tool_use block");
  }
  const summaryInput = summarizeTool.input as Partial<{ overview_ja: string; articles: SummarizeArticle[] }>;
  const summaryMap = new Map((summaryInput.articles ?? []).map((s) => [s.raw_id, s]));

  const articles: DigestArticleResult[] = classifications.map((c) => {
    const s = summaryMap.get(c.raw_id);
    return { ...c, is_model_release: c.is_model_release ?? false, title_ja: s?.title_ja ?? "", summary_ja: s?.summary_ja ?? "" };
  });

  return {
    overview_ja: summaryInput.overview_ja ?? "本日は特筆すべきAIニュースがありませんでした。",
    articles,
  };
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const wait = 1000 * 2 ** i;
      console.warn(`[claude] attempt ${i + 1}/${attempts} failed, retrying in ${wait}ms`, e);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}
