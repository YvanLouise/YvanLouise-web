create table if not exists public.works (
  id text primary key,
  title text not null,
  type text not null check (type in ('music', 'software', 'game', 'animation')),
  summary text not null default '',
  detail_intro text not null default '',
  background text not null default '',
  process text not null default '',
  result text not null default '',
  feature_list text[] not null default '{}',
  interaction_points text[] not null default '{}',
  gallery_images jsonb not null default '[]'::jsonb,
  detail_sections jsonb not null default '[]'::jsonb,
  platform text not null default '',
  status text not null default '',
  cover_url text not null default '',
  demo_url text,
  repo_url text,
  published_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pages (
  slug text primary key,
  title text not null,
  hero text not null default '',
  body text not null default '',
  highlights text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id text primary key,
  site_title text not null,
  tagline text not null default '',
  primary_cta_label text not null default '',
  primary_cta_href text not null default '/',
  secondary_cta_label text not null default '',
  secondary_cta_href text not null default '/',
  banner_badge text not null default '',
  banner_headline text not null default '',
  banner_description text not null default '',
  banner_image_url text not null default '',
  avatar_image_url text not null default '',
  afdian_url text not null default '',
  social_links jsonb not null default '[]'::jsonb,
  music_preview_clips jsonb not null default '[]'::jsonb,
  featured_work_ids jsonb not null default '[]'::jsonb,
  ui_text jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id text primary key,
  work_id text not null references public.works(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  visitor_name text,
  owner_only boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id text primary key,
  name text not null,
  contact text not null,
  subject text not null,
  body text not null,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now()
);

insert into public.site_settings (
  id,
  site_title,
  tagline,
  primary_cta_label,
  primary_cta_href,
  secondary_cta_label,
  secondary_cta_href,
  banner_badge,
  banner_headline,
  banner_description,
  banner_image_url,
  avatar_image_url,
  afdian_url,
  social_links,
  music_preview_clips,
  featured_work_ids,
  ui_text
)
values (
  'default',
  'Yvan Louise',
  '音乐 / 软件 / 游戏 / 动画',
  '查看作品',
  '/works',
  '发起委托',
  '/commission',
  'Yvan Louise 个人主页',
  '欢迎来到我的个人创作站点。',
  '这里会展示我的音乐、软件、游戏与动画作品，也开放委托、私信和支持入口。',
  '',
  '',
  '',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb
)
on conflict (id) do nothing;

alter table public.works enable row level security;
alter table public.pages enable row level security;
alter table public.site_settings enable row level security;
alter table public.reviews enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Public can read works" on public.works;
create policy "Public can read works"
on public.works
for select
using (true);

drop policy if exists "Authenticated can manage works" on public.works;
create policy "Authenticated can manage works"
on public.works
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read pages" on public.pages;
create policy "Public can read pages"
on public.pages
for select
using (true);

drop policy if exists "Authenticated can manage pages" on public.pages;
create policy "Authenticated can manage pages"
on public.pages
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
on public.site_settings
for select
using (true);

drop policy if exists "Authenticated can manage site settings" on public.site_settings;
create policy "Authenticated can manage site settings"
on public.site_settings
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Anyone can create reviews" on public.reviews;
create policy "Anyone can create reviews"
on public.reviews
for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated can read reviews" on public.reviews;
create policy "Authenticated can read reviews"
on public.reviews
for select
to authenticated
using (true);

drop policy if exists "Authenticated can update reviews" on public.reviews;
create policy "Authenticated can update reviews"
on public.reviews
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete reviews" on public.reviews;
create policy "Authenticated can delete reviews"
on public.reviews
for delete
to authenticated
using (true);

drop policy if exists "Anyone can create messages" on public.messages;
create policy "Anyone can create messages"
on public.messages
for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated can read messages" on public.messages;
create policy "Authenticated can read messages"
on public.messages
for select
to authenticated
using (true);

drop policy if exists "Authenticated can update messages" on public.messages;
create policy "Authenticated can update messages"
on public.messages
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete messages" on public.messages;
create policy "Authenticated can delete messages"
on public.messages
for delete
to authenticated
using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/svg+xml',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
    'audio/flac'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read site media" on storage.objects;
create policy "Public can read site media"
on storage.objects
for select
using (bucket_id = 'site-media');

drop policy if exists "Authenticated can upload site media" on storage.objects;
create policy "Authenticated can upload site media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'site-media');

drop policy if exists "Authenticated can update site media" on storage.objects;
create policy "Authenticated can update site media"
on storage.objects
for update
to authenticated
using (bucket_id = 'site-media')
with check (bucket_id = 'site-media');

drop policy if exists "Authenticated can delete site media" on storage.objects;
create policy "Authenticated can delete site media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'site-media');
