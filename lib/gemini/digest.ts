import type { Schema } from "@google/generative-ai";
import { Console, Context, Data, Duration, Effect, Schedule } from "effect";
import { getGemini, GEMINI_MODEL } from "./client.ts";
import {
  FILTER_SYSTEM_PROMPT,
  FILTER_RESPONSE_SCHEMA,
  SUMMARIZE_SYSTEM_PROMPT,
  SUMMARIZE_RESPONSE_SCHEMA,
} from "./prompts.ts";
import { CATEGORIES, type Category } from "../types.ts";

export type GeminiStage = "filter" | "summarize";

export type GenerateJsonRequest = {
  stage: GeminiStage;
  systemInstruction: string;
  responseSchema: Schema;
  prompt: string;
};

/**
 * One JSON-mode call to Gemini, returning the response text. A Context.Reference so the
 * production default (the real SDK) needs no wiring, and tests provide a stub.
 */
export const GenerateJson = Context.Reference<(req: GenerateJsonRequest) => Promise<string>>(
  "ai-news-feed/GenerateJson",
  {
    defaultValue: () => async (req) => {
      const model = getGemini().getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: req.systemInstruction,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: req.responseSchema,
          // gemini-2.5-flash thinking tokens consume maxOutputTokens, so reserve a generous amount.
          // With 4096 it is cut off by MAX_TOKENS before classifying 60 items and the JSON breaks.
          maxOutputTokens: 16384,
        },
      });
      const res = await model.generateContent(req.prompt);
      return res.response.text();
    },
  },
);

/** A Gemini call that still failed after every retry. stage says which of the two calls it was. */
export class GeminiError extends Data.TaggedError("GeminiError")<{
  readonly stage: GeminiStage;
  readonly cause: unknown;
}> {
  override get message(): string {
    const detail = this.cause instanceof Error ? this.cause.message : String(this.cause);
    return `gemini ${this.stage} failed: ${detail}`;
  }
}

/** Retries after a failed call: 3 attempts in all, waiting 1s then 2s (no wait after the last). */
const GEMINI_RETRIES = 2;
const retryPolicy = Schedule.exponential("1 second").pipe(
  Schedule.setInputType<GeminiError>(),
  Schedule.tap(({ attempt, duration, input }) =>
    Console.warn(
      `[gemini] attempt ${attempt}/${GEMINI_RETRIES + 1} failed, retrying in ${Duration.toMillis(duration)}ms`,
      input.cause,
    ),
  ),
);

const generateJson = (req: GenerateJsonRequest): Effect.Effect<string, GeminiError> =>
  Effect.gen(function* () {
    const call = yield* GenerateJson;
    return yield* Effect.tryPromise({
      try: () => call(req),
      catch: (cause) => new GeminiError({ stage: req.stage, cause }),
    });
  }).pipe(Effect.retry({ schedule: retryPolicy, times: GEMINI_RETRIES }));

export type DigestInput = {
  raw_id: string;
  source_name: string;
  title: string;
  url: string;
  raw_content: string | null;
};

type DigestArticleResult = {
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

const NO_NEWS_OVERVIEW = "本日は特筆すべきAIニュースがありませんでした。";

export const generateDigest = (inputs: DigestInput[]): Effect.Effect<DigestResult, GeminiError> =>
  Effect.gen(function* () {
    if (inputs.length === 0) {
      return { overview_ja: NO_NEWS_OVERVIEW, articles: [] };
    }

    // Stage 1: classify all articles
    const filterPayload = inputs.map((i) => ({
      raw_id: i.raw_id,
      source: i.source_name,
      title: i.title,
      excerpt: (i.raw_content ?? "").slice(0, 500),
    }));

    const filterText = yield* generateJson({
      stage: "filter",
      systemInstruction: FILTER_SYSTEM_PROMPT,
      responseSchema: FILTER_RESPONSE_SCHEMA,
      prompt: `以下の記事を分類してください。\n\n${JSON.stringify(filterPayload, null, 2)}`,
    });

    const filterParsed = safeJsonParse<{ articles?: unknown }>(filterText, { articles: [] });
    const classifications = normalizeClassifications(
      filterParsed.articles,
      new Set(inputs.map((i) => i.raw_id)),
    );

    // Stage 2: summarize only accepted articles
    const MIN_ARTICLE_COUNT = 5;
    const highQualityCount = classifications.filter(
      (c) => c.should_include && c.importance >= 3,
    ).length;
    const importanceThreshold = highQualityCount >= MIN_ARTICLE_COUNT ? 3 : 2;
    const accepted = classifications
      .filter((c) => c.should_include && c.importance >= importanceThreshold)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 15);

    if (accepted.length === 0) {
      return {
        overview_ja: NO_NEWS_OVERVIEW,
        articles: classifications.map((c) => ({ ...c, title_ja: "", summary_ja: "" })),
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

    const summarizeText = yield* generateJson({
      stage: "summarize",
      systemInstruction: SUMMARIZE_SYSTEM_PROMPT,
      responseSchema: SUMMARIZE_RESPONSE_SCHEMA,
      prompt: `以下の記事を日本語で要約し、総括を生成してください。\n\n${JSON.stringify(summarizePayload, null, 2)}`,
    });

    const summaryParsed = safeJsonParse<Partial<{ overview_ja: unknown; articles: unknown }>>(
      summarizeText,
      {},
    );
    const summaryMap = normalizeSummaries(summaryParsed.articles);

    const articles: DigestArticleResult[] = classifications.map((c) => {
      const s = summaryMap.get(c.raw_id);
      return {
        ...c,
        title_ja: s?.title_ja ?? "",
        summary_ja: s?.summary_ja ?? "",
      };
    });

    return {
      overview_ja: asText(summaryParsed.overview_ja, MAX_OVERVIEW_CHARS) || NO_NEWS_OVERVIEW,
      articles,
    };
  });

// Model output is untrusted data: feed content reaches the prompt, so a crafted article could
// steer the reply. Everything below pins the shape before it touches the database (the
// `importance between 1 and 5` check would otherwise fail the whole batch) or the page.
const MAX_TITLE_CHARS = 200;
const MAX_SUMMARY_CHARS = 2000;
const MAX_OVERVIEW_CHARS = 1000;
const CATEGORY_SET: ReadonlySet<string> = new Set(CATEGORIES);

/**
 * Keeps one classification per known raw_id (first wins), coerces the fields and drops ids the
 * model invented. Exported for tests.
 */
export function normalizeClassifications(raw: unknown, knownIds: ReadonlySet<string>): FilterArticle[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: FilterArticle[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const rawId = typeof r.raw_id === "string" ? r.raw_id : "";
    if (!knownIds.has(rawId) || seen.has(rawId)) continue;
    seen.add(rawId);
    out.push({
      raw_id: rawId,
      should_include: r.should_include === true,
      category: typeof r.category === "string" && CATEGORY_SET.has(r.category) ? (r.category as Category) : "other",
      importance: clampImportance(r.importance),
      is_model_release: r.is_model_release === true,
    });
  }
  return out;
}

/** Summaries keyed by raw_id; non-string text becomes "" and long text is cut. Exported for tests. */
export function normalizeSummaries(raw: unknown): Map<string, SummarizeArticle> {
  const map = new Map<string, SummarizeArticle>();
  if (!Array.isArray(raw)) return map;
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.raw_id !== "string" || map.has(r.raw_id)) continue;
    map.set(r.raw_id, {
      raw_id: r.raw_id,
      title_ja: asText(r.title_ja, MAX_TITLE_CHARS),
      summary_ja: asText(r.summary_ja, MAX_SUMMARY_CHARS),
    });
  }
  return map;
}

/** Integer in 1..5; anything unparseable is 1 (noise), never a value the DB check rejects. */
function clampImportance(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function asText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Gemini occasionally emits unescaped control characters; strip and retry.
    const sanitized = text.replace(/[\x00-\x1F\x7F]/g, (c) => {
      if (c === "\n") return "\\n";
      if (c === "\r") return "\\r";
      if (c === "\t") return "\\t";
      return "";
    });
    try {
      return JSON.parse(sanitized) as T;
    } catch (e2) {
      console.error("[gemini] JSON parse failed after sanitize:", e2, "\nraw:", text.slice(0, 200));
      return fallback;
    }
  }
}
