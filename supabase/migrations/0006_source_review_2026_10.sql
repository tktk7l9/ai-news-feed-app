-- Source review of 2026-10-06: every configured feed was fetched once and checked
-- for parse errors and for items published in the last 60 days.
-- Safe to re-run: updates match on the old state only, inserts skip existing feed_url.

-- Google AI blog moved; the old URL answers 301. Store the final URL so each run
-- saves a redirect and keeps working if the redirect is ever removed.
update sources
  set feed_url = 'https://blog.google/innovation-and-ai/technology/ai/rss/'
  where feed_url = 'https://blog.google/technology/ai/rss/';

-- VentureBeat answers every non-browser request with 429 + a bot challenge
-- (failed from Workers on 2026-10-05 and again locally on 2026-10-06, also with the
-- app's own User-Agent). Deactivate so the daily log stops reporting it; past
-- articles stay linked. Flip is_active back if the feed opens up again.
update sources
  set is_active = false
  where feed_url = 'https://venturebeat.com/category/ai/feed/';

-- New sources. Each one returned a valid RSS/Atom feed with items from the last
-- week on 2026-10-06. Weight 2 = official frontier-lab announcements.
insert into sources (name, feed_url, weight) values
  ('OpenAI News',                     'https://openai.com/news/rss.xml', 2),
  ('Google DeepMind',                 'https://deepmind.google/blog/rss.xml', 2),
  ('Google Research',                 'https://research.google/blog/rss/', 1),
  ('Microsoft Research',              'https://www.microsoft.com/en-us/research/feed/', 1),
  ('Mistral AI',                      'https://mistral.ai/news/rss', 1),
  ('Apple Machine Learning Research', 'https://machinelearning.apple.com/rss.xml', 1),
  ('NVIDIA Blog',                     'https://blogs.nvidia.com/feed/', 1),
  ('GitHub Blog (AI & ML)',           'https://github.blog/ai-and-ml/feed/', 1),
  ('MIT News (AI)',                   'https://news.mit.edu/rss/topic/artificial-intelligence2', 1),
  ('The Decoder',                     'https://the-decoder.com/feed/', 1),
  ('Ars Technica AI',                 'https://arstechnica.com/ai/feed/', 1),
  ('Import AI',                       'https://importai.substack.com/feed', 1),
  ('テクノエッジ',                     'https://www.techno-edge.net/rss20/index.rdf', 1),
  ('Publickey',                       'https://www.publickey1.jp/atom.xml', 1)
on conflict (feed_url) do nothing;
