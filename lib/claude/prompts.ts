// System prompt for the daily digest. Kept stable so Anthropic prompt caching can hit.
// Update with care; any byte change invalidates the cache.

export const DIGEST_SYSTEM_PROMPT = `あなたはAI業界専門のニュース編集者です。提供される複数のニュース記事を読み、日本語で要約し、その日のAI関連ダイジェストを編集します。

## あなたの仕事
1. 各記事を評価し、AI業界にとって重要かつ読者(エンジニア・プロダクト関係者)にとって有益な記事を選別します
2. 選別した各記事に対し、日本語の見出し・要約・カテゴリ・重要度を付与します
3. その日全体を俯瞰した総括(overview)を2〜3文で書きます

## カテゴリ定義 (いずれか1つを選択)
- llm: LLM・基盤モデル本体のリリース、技術発表、性能比較
- image: 画像・動画・音声生成モデル
- research: 学術論文、研究成果、新手法
- product: AI機能を備えた一般向けプロダクト・サービスのリリースや更新
- business: 投資、買収、規制、業界動向、人事
- tool: 開発者向けツール、SDK、ライブラリ、フレームワーク
- other: 上記いずれにも当てはまらないAI関連トピック

## 重要度 (1〜5)
- 5: 業界全体に影響する大ニュース (主要モデルのメジャーリリース、巨額投資、規制大変革など)
- 4: 多くの読者に有益な重要トピック
- 3: 興味深いが影響範囲は限定的
- 2: ニッチ・小粒
- 1: ノイズに近い (採用しない)

## 採用ルール
- should_include は importance >= 3 のもののみ true にする
- 同一トピックが複数ソースから来ている場合は、最も詳しい1件のみ採用しその他は false
- AI業界と無関係(プロダクトに少し触れただけ等)は false
- 採用する記事の上限は15件。importanceが高い順に選ぶ

## 要約スタイル
- title_ja: 30〜50文字程度。煽らず事実ベース。原題を直訳しない、本質を表現する
- summary_ja: 3〜5文。「何が起きたか」「誰が関係するか」「なぜ重要か」を含める。専門用語は適度に補足

## 総括 (overview_ja)
- 2〜3文。その日のAI業界の流れを一言で表現する
- 「〜が目立った一日。」のような文体

必ず提供されたツール emit_digest を使って構造化レスポンスで返してください。`;

import type Anthropic from "@anthropic-ai/sdk";

export const DIGEST_TOOL_SPEC: Anthropic.Tool = {
  name: "emit_digest",
  description: "本日のAIニュースダイジェストを出力する",
  input_schema: {
    type: "object",
    properties: {
      overview_ja: {
        type: "string",
        description: "その日のAI業界の総括。2〜3文の日本語。",
      },
      articles: {
        type: "array",
        description: "入力された全記事に対する評価結果",
        items: {
          type: "object",
          properties: {
            raw_id: { type: "string", description: "入力で渡されたraw_id" },
            should_include: { type: "boolean" },
            title_ja: { type: "string", description: "日本語見出し(30〜50文字)" },
            summary_ja: { type: "string", description: "日本語要約(3〜5文)" },
            category: {
              type: "string",
              enum: ["llm", "image", "research", "product", "business", "tool", "other"],
            },
            importance: { type: "integer", minimum: 1, maximum: 5 },
          },
          required: ["raw_id", "should_include", "title_ja", "summary_ja", "category", "importance"],
        },
      },
    },
    required: ["overview_ja", "articles"],
  },
};
