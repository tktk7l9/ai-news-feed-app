import { SchemaType, type Schema } from "@google/generative-ai";

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

## is_model_release の判定基準
true にするケース（いずれかを満たす場合）:
- 新しいAIモデル・AIシステムの正式リリース・一般公開
- 既存モデルのメジャーバージョンアップ (GPT-4→5, Claude 3→4 など)
- 新しいマルチモーダルモデル・推論モデルの発表
false にするケース:
- 既存モデルの活用事例・ユースケース紹介
- ベンチマーク比較・性能評価のみ
- 研究論文・技術解説
- API価格変更・機能追加（モデル自体の刷新ではない）

should_include は importance >= 3 かつAI業界に直接関連するもののみ true にしてください。同一トピックが複数ある場合は最も詳しい1件のみ true にしてください。`;

export const FILTER_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    articles: {
      type: SchemaType.ARRAY,
      description: "入力された全記事に対する分類結果",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          raw_id: { type: SchemaType.STRING },
          should_include: { type: SchemaType.BOOLEAN },
          category: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["llm", "image", "research", "product", "business", "tool", "other"],
          },
          importance: { type: SchemaType.INTEGER },
          is_model_release: { type: SchemaType.BOOLEAN },
        },
        required: ["raw_id", "should_include", "category", "importance", "is_model_release"],
      },
    },
  },
  required: ["articles"],
};

export const SUMMARIZE_SYSTEM_PROMPT = `あなたはAI業界専門のニュース編集者です。提供された記事を日本語で要約し、読者(エンジニア・プロダクト関係者)向けのダイジェストを作成します。

## 要約スタイル
- title_ja: 30〜50文字程度。煽らず事実ベース。原題を直訳しない、本質を表現する
- summary_ja: 3〜5文。「何が起きたか」「誰が関係するか」「なぜ重要か」を含める。専門用語は適度に補足

## 総括 (overview_ja)
- 2〜3文。その日のAI業界の流れを一言で表現する
- 「〜が目立った一日。」のような文体`;

export const SUMMARIZE_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    overview_ja: {
      type: SchemaType.STRING,
      description: "その日のAI業界の総括。2〜3文の日本語。",
    },
    articles: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          raw_id: { type: SchemaType.STRING },
          title_ja: { type: SchemaType.STRING, description: "日本語見出し(30〜50文字)" },
          summary_ja: { type: SchemaType.STRING, description: "日本語要約(3〜5文)" },
        },
        required: ["raw_id", "title_ja", "summary_ja"],
      },
    },
  },
  required: ["overview_ja", "articles"],
};
