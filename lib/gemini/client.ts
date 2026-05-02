import { GoogleGenerativeAI } from "@google/generative-ai";

let cached: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  cached = new GoogleGenerativeAI(apiKey);
  return cached;
}

// Free tier: 10 RPM, 250 RPD, 250K TPM (cron uses ~2 req/day)
export const GEMINI_MODEL = "gemini-2.5-flash";
