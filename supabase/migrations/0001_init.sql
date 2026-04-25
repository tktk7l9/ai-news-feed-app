-- AI News feed schema

create extension if not exists "pgcrypto";

-- News sources (RSS feeds)
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null unique,
  weight int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Raw articles fetched from RSS feeds (deduplicated by URL)
create table if not exists raw_articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  url text not null unique,
  title text not null,
  raw_content text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  is_processed boolean not null default false
);

create index if not exists raw_articles_unprocessed_idx
  on raw_articles (is_processed, published_at desc)
  where is_processed = false;

-- Articles selected for the daily digest (Claude-processed)
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  raw_article_id uuid not null references raw_articles(id) on delete cascade,
  digest_date date not null,
  title_ja text not null,
  summary_ja text not null,
  category text not null,
  importance int not null check (importance between 1 and 5),
  url text not null,
  source_name text not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists articles_digest_date_idx on articles (digest_date desc, importance desc);
create index if not exists articles_category_idx on articles (category, digest_date desc);
create unique index if not exists articles_raw_article_id_uniq on articles (raw_article_id);

-- Daily digest (one row per day, JST date)
create table if not exists daily_digests (
  date date primary key,
  overview_ja text not null,
  article_count int not null,
  generated_at timestamptz not null default now()
);

-- Email subscribers (double opt-in)
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  confirm_token text not null unique,
  confirmed_at timestamptz,
  unsubscribe_token text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists subscribers_confirmed_idx on subscribers (confirmed_at) where confirmed_at is not null;

-- RLS: lock down everything; only service_role accesses these tables.
alter table sources enable row level security;
alter table raw_articles enable row level security;
alter table articles enable row level security;
alter table daily_digests enable row level security;
alter table subscribers enable row level security;
