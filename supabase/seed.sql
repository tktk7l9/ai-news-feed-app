-- Initial RSS sources for the AI news feed (state after migration 0006, reviewed 2026-10-06).
-- Re-runs are safe thanks to the unique constraint on feed_url.

insert into sources (name, feed_url, weight) values
  -- News
  ('TechCrunch AI',                   'https://techcrunch.com/category/artificial-intelligence/feed/', 2),
  ('The Verge AI',                    'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', 2),
  ('MIT Technology Review',           'https://www.technologyreview.com/feed/', 2),
  ('The Decoder',                     'https://the-decoder.com/feed/', 1),
  ('Ars Technica AI',                 'https://arstechnica.com/ai/feed/', 1),
  ('Import AI',                       'https://importai.substack.com/feed', 1),
  -- Labs and vendors
  ('Google AI Blog',                  'https://blog.google/innovation-and-ai/technology/ai/rss/', 2),
  ('OpenAI News',                     'https://openai.com/news/rss.xml', 2),
  ('Google DeepMind',                 'https://deepmind.google/blog/rss.xml', 2),
  ('Google Research',                 'https://research.google/blog/rss/', 1),
  ('Microsoft Research',              'https://www.microsoft.com/en-us/research/feed/', 1),
  ('Mistral AI',                      'https://mistral.ai/news/rss', 1),
  ('Apple Machine Learning Research', 'https://machinelearning.apple.com/rss.xml', 1),
  ('NVIDIA Blog',                     'https://blogs.nvidia.com/feed/', 1),
  ('GitHub Blog (AI & ML)',           'https://github.blog/ai-and-ml/feed/', 1),
  ('Hugging Face Blog',               'https://huggingface.co/blog/feed.xml', 1),
  -- Research
  ('MIT News (AI)',                   'https://news.mit.edu/rss/topic/artificial-intelligence2', 1),
  ('ArXiv cs.AI',                     'https://rss.arxiv.org/rss/cs.AI', 1),
  -- Japanese
  ('ITmedia AI+',                     'https://rss.itmedia.co.jp/rss/2.0/aiplus.xml', 2),
  ('テクノエッジ',                     'https://www.techno-edge.net/rss20/index.rdf', 1),
  ('Publickey',                       'https://www.publickey1.jp/atom.xml', 1)
on conflict (feed_url) do nothing;
