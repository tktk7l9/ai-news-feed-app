<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Daily digest job

`lib/jobs/digest.ts`, `lib/rss/fetcher.ts` and `lib/gemini/digest.ts` are written with **Effect 4** (`effect`).
Each Supabase step fails as `DigestStepError` (with the step name and PostgREST code) and a Gemini call that still
fails after its retries fails as `GeminiError` (with the stage), so a failed cron run logs what broke.
`runDailyDigest` is the Promise entry for the route. Gemini and the feed parser are `Context.Reference`s
(`GenerateJson`, `ParseFeed`) so the node:test suites stub them and check retry timing on `TestClock`.
