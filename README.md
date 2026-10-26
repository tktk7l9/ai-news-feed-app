# AIニュース・ダイジェスト

[![Keyway Secrets](https://www.keyway.sh/badge.svg?repo=tktk7l9/ai-news-feed-app)](https://www.keyway.sh/vaults/tktk7l9/ai-news-feed-app)

毎朝6時（JST）に更新する、AI関連トピックの日本語ダイジェストWebアプリ。カテゴリ別閲覧・アーカイブ対応。

## 仕組み

1. **Cloudflare の Cron Triggers** が毎朝 `/api/cron/daily-digest` を叩く (`0 21 * * *` UTC = JST 06:00、`worker.js`)。Gemini が混雑（503 など）のときは 15秒・45秒・135秒と間を空けてやり直し、それでも失敗した日は 13:00 の Cron（古いレコードの削除）のあとにもう一度作る。その日のダイジェストがすでにあれば何もしない
2. Supabaseに登録された **RSSソース** を並列で取得 (過去24時間分)
3. AIキーワードでフィルタ → **Gemini 2.5 Flash** にバッチ投入してカテゴリ分類・重要度スコアリング・日本語要約と総括を一括生成
4. 重要度上位15件をDBに保存し、ISRで各ページを再検証

## セットアップ

### 1. 依存インストール

```bash
npm install
```

### 2. Supabase

1. [Supabase](https://supabase.com) でプロジェクト作成
2. SQL Editorで `supabase/migrations/0001_init.sql` を実行
3. SQL Editorで `supabase/seed.sql` を実行 (初期RSSソース投入)
4. Project Settings → API から `URL` / `service_role key` を取得（anon key は使わない。Supabase へはサーバーからだけ接続する）

### 3. Google Gemini

- [Google AI Studio](https://aistudio.google.com/app/apikey) でAPIキー発行 (無料枠あり)

### 4. 環境変数

`.env.local` を作成し、以下を設定（ひな形ファイルは無い）。`npm run preview`（Workers のランタイムで確認）は `.env.local` ではなく `.dev.vars` を読むので、そちらにも同じキーを置く（どちらも gitignore 済み）。

| 変数名 | 説明 |
|--------|------|
| `GEMINI_API_KEY` | Google Gemini APIキー |
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL (サーバー側だけで使う) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service roleキー (サーバー専用) |
| `CRON_SECRET` | Cronエンドポイント認証トークン |
| `NEXT_PUBLIC_SITE_URL` | 任意。OGP・canonical の基準 URL (未設定なら `https://ai-news-feed-app.saitotakuya0719.workers.dev`) |

`CRON_SECRET` は以下で生成:

```bash
openssl rand -hex 32
```

### 5. ローカル起動

```bash
npm run dev
# http://localhost:3000
```

### 6. 日次ジョブを手動トリガ

```bash
curl -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)" \
  http://localhost:3000/api/cron/daily-digest
```

レスポンスに `{ "date": "...", "accepted": N }` が返れば成功。

### 7. デプロイ (Cloudflare Workers)

本番は https://ai-news-feed-app.saitotakuya0719.workers.dev 。main に push すると Workers Builds がビルドしてデプロイする。手元から出す場合は次のとおり。

```bash
npm run deploy   # opennextjs-cloudflare build && deploy
```

秘密の値は Worker のシークレットとして設定する (`wrangler.jsonc` には書かない。`.env.local` はローカル開発専用)。

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret list   # 設定済みの一覧
```

Cron の定義は `wrangler.jsonc` の `triggers.crons` で、デプロイすると有効になる。叩く URL は `worker.js` の `CRON_JOBS` に書いてあり、両方をそろえておく。

## ディレクトリ構成

```
app/
  page.tsx                      # 今日のダイジェスト
  archive/page.tsx              # アーカイブ一覧
  archive/[date]/page.tsx       # 指定日 (YYYY-MM-DD)
  category/[slug]/page.tsx      # カテゴリ別
  api/
    cron/daily-digest/route.ts  # 日次バッチ (RSS取得 → Gemini → DB保存)
    cron/cleanup/route.ts       # 古いレコード削除 (90日/14日)
components/
  ArticleCard.tsx               # 記事カード
  CategoryBadge.tsx             # カテゴリバッジ
  DailyOverview.tsx             # 日次概要ヘッダー
  ModelSidebar.tsx              # 最新AIモデル一覧サイドバー
  WeeklyTopArticles.tsx         # 今週の注目記事サイドバー
  WeeklyStats.tsx               # カテゴリ別週次統計サイドバー
lib/
  supabase/server.ts            # Service roleクライアント (サーバー専用)
  rss/fetcher.ts                # RSSフィード取得
  rss/filter.ts                 # AIキーワードフィルタ
  gemini/client.ts              # Gemini SDKラッパー
  gemini/digest.ts              # ダイジェスト生成
  gemini/prompts.ts             # システムプロンプト・スキーマ定義
  queries.ts                    # 共通DBクエリ
  types.ts                      # 共通型定義
  date.ts                       # JST日付ユーティリティ
  url.ts                        # URL安全性検証
supabase/
  migrations/0001_init.sql      # スキーマ定義 (RLS有効)
  seed.sql                      # 初期RSSソース
worker.js                       # Workers のエントリ (CSP nonce + Cron の scheduled)
wrangler.jsonc                  # Workers 設定 (Cron Triggers・R2・Durable Objects)
```

## セキュリティ

- **Cronエンドポイント**: `CRON_SECRET` によるBearerトークン認証 (タイミングセーフ比較)
- **Supabase RLS**: 全テーブルにRow Level Security設定済み。サービスロールキーはサーバーサイドのみ使用
- **HTTPセキュリティヘッダー**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Cross-Origin-Opener-Policy: same-origin`, `HSTS`, `Permissions-Policy` を全レスポンスに付与
- **CSP**: 本番の HTML は `worker.js` (Workers のエントリ) を通り、`script-src` の `'unsafe-inline'` をリクエストごとの nonce に置き換え、インラインの JavaScript の `<script>` にだけ同じ nonce を付ける (`lib/csp-nonce.ts`。外部スクリプトや JSON-LD などのデータには付けない)。CSP ヘッダーは常に1本。ニュースの本文は外部フィード由来のため、必ずテキストとして描画する (HTML として埋め込む箇所はテストで禁止)。Cloudflare Web Analytics のビーコンは HTML に書かず、表示後に追加する (`components/Analytics.tsx`)。ブラウザから出る外部通信はこのビーコンだけ (Supabase・Gemini はサーバー側のみ)
- **URL検証**: 記事リンクは `http:`/`https:` スキームのみ許可 (`javascript:` 等を無効化)
- **RSSフィード**: `http:`/`https:` スキームのみフェッチ許可。1フィードの本文は 8 MB まで・15 秒でタイムアウト。記事リンクも `http:`/`https:` 以外は保存しない
- **Gemini の出力**: カテゴリ・重要度・raw_id を検証してから保存 (範囲外の値や存在しない id は捨てる)。本文はテキストとして描画し HTML としては扱わない
- **エラーレスポンス**: 内部エラー詳細 (スタックトレース・DBエラー) は外部に漏洩させずサーバーログのみに記録

## Tips

- **RSSソースを追加**: `supabase/seed.sql` または `sources` テーブルに直接INSERT
- **特定ソースを一時停止**: `sources` テーブルの `is_active = false` に更新
- **採用件数の上限変更**: `lib/jobs/digest.ts` の `slice(0, 15)`
- **Gemini に送る候補の選び方**: `lib/jobs/candidates.ts`。ソースの `weight` 降順 → 公開日時の新しい順で並べ、1ソースあたり最大 `PER_SOURCE_CAP` 件 (= 60 ÷ 15 = 4 件) に抑えてから 60 件を送る。arXiv のような大量投稿ソースが他を押し出さないようにするため
- **AIキーワードフィルタ調整**: `lib/rss/filter.ts` の `AI_KEYWORDS`
- **要約スタイル変更**: `lib/gemini/prompts.ts`

## ライセンス

Personal use.
