type Tier = "S" | "A" | "B";

const MODELS: {
  name: string;
  provider: string;
  released: string;
  score: number;
  tier: Tier;
}[] = [
  // S — frontier / state-of-the-art
  { name: "Claude Opus 4.7",   provider: "Anthropic", released: "2025",    score: 92, tier: "S" },
  { name: "o3",                provider: "OpenAI",    released: "2025-01",  score: 91, tier: "S" },
  // A — highly capable
  { name: "Claude Sonnet 4.6", provider: "Anthropic", released: "2025",    score: 85, tier: "A" },
  { name: "o1",                provider: "OpenAI",    released: "2024-09",  score: 84, tier: "A" },
  { name: "DeepSeek R1",       provider: "DeepSeek",  released: "2025-01",  score: 83, tier: "A" },
  { name: "GPT-4o",            provider: "OpenAI",    released: "2024-05",  score: 82, tier: "A" },
  { name: "Gemini 2.0 Flash",  provider: "Google",    released: "2024-12",  score: 80, tier: "A" },
  { name: "DeepSeek V3",       provider: "DeepSeek",  released: "2024-12",  score: 79, tier: "A" },
  { name: "Llama 3.3 70B",     provider: "Meta",      released: "2024-12",  score: 77, tier: "A" },
  // B — capable / open-weight
  { name: "Qwen 2.5 72B",      provider: "Alibaba",   released: "2024-09",  score: 74, tier: "B" },
  { name: "Mistral Large 2",   provider: "Mistral",   released: "2024-07",  score: 72, tier: "B" },
  { name: "Grok 2",            provider: "xAI",       released: "2024-08",  score: 71, tier: "B" },
  { name: "Claude Haiku 4.5",  provider: "Anthropic", released: "2025",    score: 70, tier: "B" },
];

const TIER_LABEL: Record<Tier, string> = { S: "S — フロンティア", A: "A — 高性能", B: "B — 軽量・OSS" };
const TIER_BADGE: Record<Tier, string> = {
  S: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  A: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  B: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};
const TIER_BAR: Record<Tier, string> = {
  S: "bg-amber-400 dark:bg-amber-500",
  A: "bg-orange-400 dark:bg-orange-500",
  B: "bg-neutral-400 dark:bg-neutral-500",
};

const tiers: Tier[] = ["S", "A", "B"];

export function ModelSidebar() {
  const grouped = tiers.map((t) => ({ tier: t, models: MODELS.filter((m) => m.tier === t) }));

  return (
    <section className="rounded-2xl overflow-hidden border border-black/6 dark:border-white/8 bg-white/70 dark:bg-black/40 backdrop-blur-md">
      <div className="px-4 pt-4 pb-3 border-b border-black/6 dark:border-white/8">
        <h2 className="text-xs font-semibold tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">
          主要 AIモデル
        </h2>
        <p className="text-[10px] text-neutral-600 dark:text-neutral-400 mt-0.5">
          スコアはベンチマーク合成値（概算）
        </p>
      </div>

      <div className="divide-y divide-black/4 dark:divide-white/5">
        {grouped.map(({ tier, models }) => (
          <div key={tier} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TIER_BADGE[tier]}`}>
                {tier}
              </span>
              <span className="text-[10px] text-neutral-600 dark:text-neutral-400">
                {TIER_LABEL[tier]}
              </span>
            </div>

            <div className="space-y-2.5">
              {models.map((m) => {
                // score bar: normalize 60–100 → 0–100%
                const pct = Math.max(0, Math.min(100, (m.score - 60) / 40 * 100));
                return (
                  <div key={m.name}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[12px] font-medium text-neutral-800 dark:text-neutral-200 leading-tight">
                        {m.name}
                      </span>
                      <span className="text-[10px] font-semibold tabular-nums text-neutral-500 dark:text-neutral-400 ml-2 shrink-0">
                        {m.score}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-neutral-600 dark:text-neutral-400 w-16 shrink-0 truncate">
                        {m.provider}
                      </span>
                      <span className="text-[10px] text-neutral-700 dark:text-neutral-300 shrink-0">
                        {m.released}
                      </span>
                    </div>
                    <div className="h-0.5 bg-black/5 dark:bg-white/5 rounded-full mt-1">
                      <div
                        className={`h-0.5 rounded-full ${TIER_BAR[tier]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-black/4 dark:border-white/5">
        <p className="text-[10px] text-neutral-700 dark:text-neutral-400">
          最終更新: 2025年初頭時点
        </p>
      </div>
    </section>
  );
}
