# AIニュース・ダイジェスト

[![Keyway Secrets](https://www.keyway.sh/badge.svg?repo=tktk7l9/ai-news-feed-app)](https://www.keyway.sh/vaults/tktk7l9/ai-news-feed-app)

毎朝6時（JST）に更新する、AI関連トピックの日本語ダイジェストWebアプリ。カテゴリ別閲覧・アーカイブ対応。

## 仕組み

1. **Vercel Cron** が毎朝 `/api/cron/daily-digest` を叩く (`0 21 * * *` UTC = JST 06:00)
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
4. Project Settings → API から `URL` / `anon key` / `service_role key` を取得

### 3. Google Gemini

- [Google AI Studio](https://aistudio.google.com/app/apikey) でAPIキー発行 (無料枠あり)

### 4. 環境変数

`.env.local.example` をコピーして `.env.local` を作成し、各値を設定。

```bash
cp .env.local.example .env.local
```

| 変数名 | 説明 |
|--------|------|
| `GEMINI_API_KEY` | Google Gemini APIキー |
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymousキー |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service roleキー (サーバー専用) |
| `CRON_SECRET` | Cronエンドポイント認証トークン |
| `APP_URL` | 本番ドメイン (デフォルト: `http://localhost:3000`) |

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

### 7. デプロイ

```bash
vercel
```

Vercel Dashboard で環境変数を設定 (`.env.local` と同じキー)。`vercel.json` の Cron 定義がデプロイ後に自動で有効化される。

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
  WebGLBackground.tsx           # WebGL背景エフェクト
lib/
  supabase/server.ts            # Service roleクライアント (サーバー専用)
  supabase/client.ts            # Anonymousクライアント (ブラウザ用)
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
vercel.json                     # Cron定義
```

## セキュリティ

- **Cronエンドポイント**: `CRON_SECRET` によるBearerトークン認証 (タイミングセーフ比較)
- **Supabase RLS**: 全テーブルにRow Level Security設定済み。サービスロールキーはサーバーサイドのみ使用
- **HTTPセキュリティヘッダー**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `HSTS`, `Permissions-Policy` を全レスポンスに付与
- **URL検証**: 記事リンクは `http:`/`https:` スキームのみ許可 (`javascript:` 等を無効化)
- **RSSフィード**: `http:`/`https:` スキームのみフェッチ許可
- **エラーレスポンス**: 内部エラー詳細 (スタックトレース・DBエラー) は外部に漏洩させずサーバーログのみに記録

## Tips

- **RSSソースを追加**: `supabase/seed.sql` または `sources` テーブルに直接INSERT
- **特定ソースを一時停止**: `sources` テーブルの `is_active = false` に更新
- **採用件数の上限変更**: `lib/jobs/digest.ts` の `slice(0, 15)`
- **AIキーワードフィルタ調整**: `lib/rss/filter.ts` の `AI_KEYWORDS`
- **要約スタイル変更**: `lib/gemini/prompts.ts`

## ライセンス

Personal use.
