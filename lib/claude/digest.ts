import { getAnthropic, CLAUDE_MODEL } from "./client";
import { DIGEST_SYSTEM_PROMPT, DIGEST_TOOL_SPEC } from "./prompts";
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
};

export type DigestResult = {
  overview_ja: string;
  articles: DigestArticleResult[];
};

export async function generateDigest(inputs: DigestInput[]): Promise<DigestResult> {
  if (inputs.length === 0) {
    return { overview_ja: "本日は特筆すべきAIニュースがありませんでした。", articles: [] };
  }

  const userPayload = inputs.map((i) => ({
    raw_id: i.raw_id,
    source: i.source_name,
    title: i.title,
    url: i.url,
    excerpt: (i.raw_content ?? "").slice(0, 1500),
  }));

  const anthropic = getAnthropic();

  const res = await withRetry(() =>
    anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      system: [
        {
          type: "text",
          text: DIGEST_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [DIGEST_TOOL_SPEC],
      tool_choice: { type: "tool", name: DIGEST_TOOL_SPEC.name },
      messages: [
        {
          role: "user",
          content: `以下の記事群を評価してダイジェストを生成してください。\n\n${JSON.stringify(userPayload, null, 2)}`,
        },
      ],
    }),
  );

  const toolUse = res.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude response did not include a tool_use block");
  }
  return toolUse.input as DigestResult;
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
