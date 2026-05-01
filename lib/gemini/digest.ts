import { getGemini, GEMINI_MODEL } from "./client";
import {
  FILTER_SYSTEM_PROMPT,
  FILTER_RESPONSE_SCHEMA,
  SUMMARIZE_SYSTEM_PROMPT,
  SUMMARIZE_RESPONSE_SCHEMA,
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

  // Stage 1: classify all articles
  const filterModel = getGemini().getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: FILTER_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: FILTER_RESPONSE_SCHEMA,
      maxOutputTokens: 4096,
    },
  });

  const filterPayload = inputs.map((i) => ({
    raw_id: i.raw_id,
    source: i.source_name,
    title: i.title,
    excerpt: (i.raw_content ?? "").slice(0, 500),
  }));

  const filterRes = await withRetry(() =>
    filterModel.generateContent(
      `以下の記事を分類してください。\n\n${JSON.stringify(filterPayload, null, 2)}`,
    ),
  );

  const filterParsed = JSON.parse(filterRes.response.text()) as { articles?: FilterArticle[] };
  const classifications = filterParsed.articles ?? [];

  // Stage 2: summarize only accepted articles
  const accepted = classifications
    .filter((c) => c.should_include && c.importance >= 3)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 15);

  if (accepted.length === 0) {
    return {
      overview_ja: "本日は特筆すべきAIニュースがありませんでした。",
      articles: classifications.map((c) => ({
        ...c,
        is_model_release: c.is_model_release ?? false,
        title_ja: "",
        summary_ja: "",
      })),
    };
  }

  const summarizeModel = getGemini().getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SUMMARIZE_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SUMMARIZE_RESPONSE_SCHEMA,
      maxOutputTokens: 4096,
    },
  });

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
    summarizeModel.generateContent(
      `以下の記事を日本語で要約し、総括を生成してください。\n\n${JSON.stringify(summarizePayload, null, 2)}`,
    ),
  );

  const summaryParsed = JSON.parse(summarizeRes.response.text()) as Partial<{
    overview_ja: string;
    articles: SummarizeArticle[];
  }>;
  const summaryMap = new Map((summaryParsed.articles ?? []).map((s) => [s.raw_id, s]));

  const articles: DigestArticleResult[] = classifications.map((c) => {
    const s = summaryMap.get(c.raw_id);
    return {
      ...c,
      is_model_release: c.is_model_release ?? false,
      title_ja: s?.title_ja ?? "",
      summary_ja: s?.summary_ja ?? "",
    };
  });

  return {
    overview_ja: summaryParsed.overview_ja ?? "本日は特筆すべきAIニュースがありませんでした。",
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
      console.warn(`[gemini] attempt ${i + 1}/${attempts} failed, retrying in ${wait}ms`, e);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}
