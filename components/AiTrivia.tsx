"use client";

import { useState } from "react";
import { AI_TRIVIA, pickRandomTrivia } from "@/lib/trivia";

export function AiTrivia({ initial }: { initial: string }) {
  const [trivia, setTrivia] = useState(initial);

  const next = () => {
    if (AI_TRIVIA.length <= 1) return;
    let candidate = pickRandomTrivia();
    while (candidate === trivia) candidate = pickRandomTrivia();
    setTrivia(candidate);
  };

  return (
    <section
      aria-label="AI雑学"
      className="rounded-2xl border border-amber-200/70 bg-amber-50/70 px-5 py-5
                 dark:border-amber-900/50 dark:bg-amber-950/30"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">💡</span>
        <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-amber-700 dark:text-amber-400">
          AI 雑学
        </span>
      </div>
      <p className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
        {trivia}
      </p>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={next}
          className="text-xs px-3 py-1 rounded-full border border-amber-300/70 text-amber-800
                     hover:bg-amber-100
                     dark:border-amber-800/70 dark:text-amber-300 dark:hover:bg-amber-950/60"
        >
          別の雑学を見る
        </button>
      </div>
    </section>
  );
}
