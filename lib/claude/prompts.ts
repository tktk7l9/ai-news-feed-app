import type Anthropic from "@anthropic-ai/sdk";

// Stage 1: Classification prompt (used with Haiku).
// Kept stable so prompt caching can hit. Update with care.
export const FILTER_SYSTEM_PROMPT = `あなたはAI業界ニュースの分類器です。各記事がAI業界にとって重要かどうかを評価し、カテゴリと重要度を付与してください。

## カテゴリ定義
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
- 1: ノイズに近い

should_include は importance >= 3 かつAI業界に直接関連するもののみ true にしてください。同一トピックが複数ある場合は最も詳しい1件のみ true にしてください。`;

export const FILTER_TOOL_SPEC: Anthropic.Tool = {
  name: "emit_classifications",
  description: "全記事の分類結果を出力する",
  input_schema: {
    type: "object",
    properties: {
      articles: {
        type: "array",
        description: "入力された全記事に対する分類結果",
        items: {
          type: "object",
          properties: {
            raw_id: { type: "string" },
            should_include: { type: "boolean" },
            category: {
              type: "string",
              enum: ["llm", "image", "research", "product", "business", "tool", "other"],
            },
            importance: { type: "integer", minimum: 1, maximum: 5 },
          },
          required: ["raw_id", "should_include", "category", "importance"],
        },
      },
    },
    required: ["articles"],
  },
};

// Stage 2: Summarization prompt (used with Sonnet, for accepted articles only).
// Kept stable so prompt caching can hit. Update with care.
export const SUMMARIZE_SYSTEM_PROMPT = `あなたはAI業界専門のニュース編集者です。提供された記事を日本語で要約し、読者(エンジニア・プロダクト関係者)向けのダイジェストを作成します。

## 要約スタイル
- title_ja: 30〜50文字程度。煽らず事実ベース。原題を直訳しない、本質を表現する
- summary_ja: 3〜5文。「何が起きたか」「誰が関係するか」「なぜ重要か」を含める。専門用語は適度に補足

## 総括 (overview_ja)
- 2〜3文。その日のAI業界の流れを一言で表現する
- 「〜が目立った一日。」のような文体`;

export const SUMMARIZE_TOOL_SPEC: Anthropic.Tool = {
  name: "emit_summaries",
  description: "採用記事の日本語要約と総括を出力する",
  input_schema: {
    type: "object",
    properties: {
      overview_ja: {
        type: "string",
        description: "その日のAI業界の総括。2〜3文の日本語。",
      },
      articles: {
        type: "array",
        items: {
          type: "object",
          properties: {
            raw_id: { type: "string" },
            title_ja: { type: "string", description: "日本語見出し(30〜50文字)" },
            summary_ja: { type: "string", description: "日本語要約(3〜5文)" },
          },
          required: ["raw_id", "title_ja", "summary_ja"],
        },
      },
    },
    required: ["overview_ja", "articles"],
  },
};
