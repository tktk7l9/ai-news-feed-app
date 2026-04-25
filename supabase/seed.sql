-- Initial RSS sources for the AI news feed.
-- Re-runs are safe thanks to the unique constraint on feed_url.

insert into sources (name, feed_url, weight) values
  ('TechCrunch AI',         'https://techcrunch.com/category/artificial-intelligence/feed/', 2),
  ('The Verge AI',          'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', 2),
  ('VentureBeat AI',        'https://venturebeat.com/category/ai/feed/', 1),
  ('MIT Technology Review', 'https://www.technologyreview.com/feed/', 2),
  ('Google AI Blog',        'https://blog.google/technology/ai/rss/', 2),
  ('Hugging Face Blog',     'https://huggingface.co/blog/feed.xml', 1),
  ('ArXiv cs.AI',           'https://rss.arxiv.org/rss/cs.AI', 1),
  ('ITmedia AI+',           'https://rss.itmedia.co.jp/rss/2.0/aiplus.xml', 2),
  ('ZDNet Japan AI',        'https://japan.zdnet.com/rss/sp_ai/index.rdf', 1)
on conflict (feed_url) do nothing;
