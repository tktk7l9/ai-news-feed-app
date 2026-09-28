// Turns backend failures into a constructive user message (SHIG 55, 11).
// The raw detail (PostgREST text, missing env names) is only logged server-side.

export const LOAD_ERROR_MESSAGE =
  "ニュースを読み込めませんでした。時間をおいて再読み込みしてください。";

export function describeError(err: unknown): string {
  if (!err) return "unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function toLoadError(
  context: string,
  err: unknown,
  log: (...args: unknown[]) => void = console.error,
): string {
  log(`[queries] ${context} failed:`, describeError(err));
  return LOAD_ERROR_MESSAGE;
}
