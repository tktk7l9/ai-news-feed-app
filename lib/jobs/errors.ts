import { Data } from "effect";
import type { GeminiError } from "../gemini/digest.ts";
import { describeError } from "../load-error.ts";

export type DigestStep =
  | "connect"
  | "load_sources"
  | "save_raw"
  | "load_candidates"
  | "save_articles"
  | "save_digest"
  | "mark_processed";

/**
 * A Supabase step of the digest failed. step names which one, and the message carries the
 * PostgREST code / details, so a failed cron run says what broke instead of a bare stack.
 */
export class DigestStepError extends Data.TaggedError("DigestStepError")<{
  readonly step: DigestStep;
  readonly cause: unknown;
}> {
  override get message(): string {
    return `digest step ${this.step} failed: ${describe(this.cause)}`;
  }
}

export type DigestError = DigestStepError | GeminiError;

/**
 * describeError (shared with the page loaders) plus the PostgREST code, which is what tells
 * an RLS denial (42501) from a timeout (57014) when reading a failed cron run.
 */
export function describe(cause: unknown): string {
  const text = describeError(cause);
  const code = typeof cause === "object" && cause !== null ? (cause as { code?: unknown }).code : undefined;
  return typeof code === "string" && code !== "" ? `${text} (code=${code})` : text;
}
