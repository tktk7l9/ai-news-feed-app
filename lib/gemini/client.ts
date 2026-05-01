import { GoogleGenerativeAI } from "@google/generative-ai";

let cached: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  cached = new GoogleGenerativeAI(apiKey);
  return cached;
}

// Free tier: 1500 req/day, 1M tokens/min
export const GEMINI_MODEL = "gemini-1.5-flash";
