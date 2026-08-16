/**
 * Cloudflare Workers のエントリポイント。
 *
 * @opennextjs/cloudflare が生成する .open-next/worker.js は fetch ハンドラしか
 * 持たないため、Cron Triggers から呼ばれる scheduled ハンドラをここで足す。
 * Vercel Cron（vercel.json の crons）の置き換え。
 *
 * cron ルートは Bearer CRON_SECRET で保護された GET なので、Worker 内部から
 * 同じリクエストを組み立てて fetch ハンドラに渡す。CRON_SECRET は
 * `wrangler secret put CRON_SECRET` で設定する。
 *
 * .open-next/ はビルド生成物なので .gitignore 済み。このファイルは
 * tsconfig の対象外（プレーン JS）にして、ビルド前の型チェックで
 * 未生成の import を解決しにいかないようにしている。
 */
import openNextHandler from "./.open-next/worker.js";

export { DOQueueHandler } from "./.open-next/worker.js";
export { DOShardedTagCache } from "./.open-next/worker.js";
export { BucketCachePurge } from "./.open-next/worker.js";

// wrangler.jsonc の triggers.crons と対応させること。
const CRON_PATHS = {
  "0 21 * * *": "/api/cron/daily-digest", // JST 06:00
  "0 4 * * *": "/api/cron/cleanup",
};

const worker = {
  fetch: openNextHandler.fetch,

  async scheduled(controller, env, ctx) {
    const path = CRON_PATHS[controller.cron];
    if (!path) {
      console.error(`[cron] 未知のスケジュール: ${controller.cron}`);
      return;
    }
    const request = new Request(`https://ai-news-feed-app.saitotakuya0719.workers.dev${path}`, {
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
    ctx.waitUntil(
      openNextHandler.fetch(request, env, ctx).then(
        (res) => console.log(`[cron] ${path} -> ${res.status}`),
        (err) => console.error(`[cron] ${path} 失敗`, err),
      ),
    );
  },
};

export default worker;
