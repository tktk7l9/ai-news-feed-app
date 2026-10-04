-- Fix RSS sources that started failing in the 2026-10-05 daily digest.
-- Safe to re-run: each statement matches on the old state only.

-- The Verge moved its AI feed (old URL returns 404; the new one is Atom).
update sources
  set feed_url = 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml'
  where feed_url = 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml';

-- ZDNet Japan no longer serves RSS (every feed path returns 404).
-- Deactivate instead of delete so its past articles stay linked.
update sources
  set is_active = false
  where feed_url = 'https://japan.zdnet.com/rss/sp_ai/index.rdf';
