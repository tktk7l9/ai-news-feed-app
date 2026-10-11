<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## CSP (per-request nonce in the Worker)

- `next.config.ts` serves the static CSP. Its `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com`
  is only the baseline: `wrangler.jsonc` `main` is `worker.js`, which wraps `.open-next/worker.js` and, for every
  `text/html` response, replaces that `'unsafe-inline'` with a fresh 128-bit `'nonce-…'` and stamps the nonce on each
  inline `<script>` via HTMLRewriter (streaming; `lib/csp-nonce.ts`). The header is replaced, never appended: exactly
  one CSP per response. ETag/Content-Length are dropped because the body changes per request. Non-HTML responses keep
  the static header; `next dev` / `next start` do not run the Worker.
- **Never point `main` back at `.open-next/worker.js`**: pages still work, but `'unsafe-inline'` silently returns
  (and the crons stop). `lib/worker-entry.test.ts` loads `worker.js` with a fake generated worker and guards both.
- **Never add `'strict-dynamic'`**: it would switch off `'self'` (the `/_next/static` chunks) and the beacon host
  source. External scripts get no nonce, so an injected `<script src>` from another origin stays blocked.
- The rewriter nonces every inline `<script>` in the HTML, injected or not, so never render untrusted HTML
  (`dangerouslySetInnerHTML`); article text from RSS/Gemini is rendered as text.
- The Cloudflare Web Analytics beacon is appended after hydration (`components/Analytics.tsx`, token in
  `lib/analytics.ts`), so the HTML has no external script. **Never add `integrity` to it**: Cloudflare updates
  `beacon.min.js` in place, so SRI would silently stop the beacon. The CSP keeps `https://static.cloudflareinsights.com`
  in `script-src` and `https://cloudflareinsights.com` in `connect-src`. Supabase and Gemini are server-only, so
  neither is in `connect-src`.

## Daily digest job

`lib/jobs/digest.ts`, `lib/rss/fetcher.ts` and `lib/gemini/digest.ts` are written with **Effect 4** (`effect`).
Each Supabase step fails as `DigestStepError` (with the step name and PostgREST code) and a Gemini call that still
fails after its retries fails as `GeminiError` (with the stage), so a failed cron run logs what broke.
`runDailyDigest` is the Promise entry for the route. Gemini and the feed parser are `Context.Reference`s
(`GenerateJson`, `ParseFeed`) so the node:test suites stub them and check retry timing on `TestClock`.
