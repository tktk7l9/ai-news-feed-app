# AIニュース・ダイジェスト

毎朝7時(JST)に更新する、AI関連トピックの日本語ダイジェストWebアプリ。

## 仕組み

1. **Vercel Cron** が日次で `/api/cron/daily-digest` を叩く
2. Supabaseに登録された **RSSソース** を並列で取得 (過去24時間分)
3. AIキーワードでフィルタ → **Claude API (claude-sonnet-4-6)** にバッチ投入
4. 各記事の日本語要約・カテゴリ・重要度と、その日の総括を構造化出力
5. 採用15件をDBに保存し、ISRで再検証 + 購読者にメール送信

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

### 3. Anthropic / Resend

- [console.anthropic.com](https://console.anthropic.com) でAPIキー発行
- (任意) [resend.com](https://resend.com) でAPIキー発行・送信元ドメイン認証

### 4. 環境変数

`.env.local.example` をコピーして `.env.local` を作成し、各値を設定。

```bash
cp .env.local.example .env.local
# 各値を埋める
# CRON_SECRET は openssl rand -hex 32 などで生成
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

レスポンスに `{ "date": "...", "accepted": N }` が返れば成功。Supabaseの `articles` と `daily_digests` テーブルにレコードが入る。

### 7. デプロイ

```bash
# Vercelにデプロイ
vercel
# 環境変数をVercel Dashboardで設定 (.env.local と同じキー)
# APP_URL は本番ドメインに更新
```

`vercel.json` に Cron 定義 (`0 22 * * *` UTC = JST 翌日07:00) があり、デプロイ後自動有効化される。

## ディレクトリ構成

```
app/
  page.tsx                      # 今日のダイジェスト
  archive/page.tsx              # アーカイブ一覧
  archive/[date]/page.tsx       # 指定日
  category/[slug]/page.tsx      # カテゴリ別
  subscribe/page.tsx            # メール購読フォーム
  feed.xml/route.ts             # RSS出力
  api/
    cron/daily-digest/route.ts  # 日次バッチ
    subscribe/confirm/route.ts  # ダブルオプトイン
    unsubscribe/route.ts        # 解除
components/                     # ArticleCard / CategoryBadge / DailyOverview
lib/
  supabase/                     # サーバー / ブラウザクライアント
  rss/                          # フィード取得 + キーワードフィルタ
  claude/                       # Claude API ラッパー (プロンプトキャッシュ)
  email/                        # Resend + メールテンプレート
  queries.ts                    # 共通DBクエリ
  types.ts                      # 共通型定義
  date.ts                       # JST日付ユーティリティ
supabase/
  migrations/0001_init.sql      # スキーマ
  seed.sql                      # 初期RSSソース
vercel.json                     # Cron定義
```

## Tips

- **RSSソースを追加/削除**: `sources` テーブルに直接INSERT/UPDATE
- **特定ソースを一時停止**: `is_active = false` に
- **採用件数の上限**: `app/api/cron/daily-digest/route.ts` の `slice(0, 15)`
- **AIキーワードフィルタ調整**: `lib/rss/filter.ts` の `AI_KEYWORDS`
- **要約スタイル変更**: `lib/claude/prompts.ts` (※プロンプトキャッシュが無効化されるので変更時は注意)

## ライセンス

Personal use.
