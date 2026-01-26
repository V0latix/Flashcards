-- User data + sync tables for Flashcards (Supabase)
-- Run in Supabase SQL editor or migrations system.

-- Extensions
create extension if not exists "pgcrypto";

-- Optional profile table (minimal, can be extended later)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User cards (user-owned copy of cards, including packs)
create table if not exists public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('public_pack', 'manual')),
  source_ref text,
  source_public_id text,
  front_md text not null,
  back_md text not null,
  hint_md text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_cards_user_id_idx on public.user_cards (user_id);
create index if not exists user_cards_source_idx on public.user_cards (user_id, source_type, source_ref);
create index if not exists user_cards_public_id_idx on public.user_cards (user_id, source_public_id);

-- User progress (Leitner state)
create table if not exists public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.user_cards(id) on delete cascade,
  box int not null check (box >= 0 and box <= 5),
  learned boolean not null default false,
  due_at timestamptz,
  last_reviewed_at timestamptz,
  correct_count int not null default 0,
  wrong_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create index if not exists user_progress_user_id_idx on public.user_progress (user_id);
create index if not exists user_progress_updated_at_idx on public.user_progress (user_id, updated_at);

-- User settings (Leitner parameters)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  box1_target int not null default 10,
  intervals jsonb not null default '{"1":1,"2":3,"3":7,"4":15,"5":30}',
  learned_review_interval_days int not null default 90,
  reverse_probability double precision not null default 0,
  updated_at timestamptz not null default now()
);

-- Review log (append-only, dedup by client_event_id)
create table if not exists public.user_review_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.user_cards(id) on delete cascade,
  result boolean not null,
  reviewed_at timestamptz not null,
  device_id text,
  client_event_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, client_event_id)
);

create index if not exists user_review_log_user_id_idx on public.user_review_log (user_id);
create index if not exists user_review_log_reviewed_at_idx on public.user_review_log (user_id, reviewed_at);

-- Updated_at trigger (shared)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_cards_set_updated_at on public.user_cards;
create trigger user_cards_set_updated_at
before update on public.user_cards
for each row execute function public.set_updated_at();

drop trigger if exists user_progress_set_updated_at on public.user_progress;
create trigger user_progress_set_updated_at
before update on public.user_progress
for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

-- RLS
alter table public.user_profiles enable row level security;
alter table public.user_cards enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_review_log enable row level security;

-- Policies: user can only access their own rows
drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
on public.user_profiles for select
using (id = auth.uid());

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
on public.user_profiles for insert
with check (id = auth.uid());

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
on public.user_profiles for update
using (id = auth.uid());

drop policy if exists "user_cards_select_own" on public.user_cards;
create policy "user_cards_select_own"
on public.user_cards for select
using (user_id = auth.uid());

drop policy if exists "user_cards_insert_own" on public.user_cards;
create policy "user_cards_insert_own"
on public.user_cards for insert
with check (user_id = auth.uid());

drop policy if exists "user_cards_update_own" on public.user_cards;
create policy "user_cards_update_own"
on public.user_cards for update
using (user_id = auth.uid());

drop policy if exists "user_cards_delete_own" on public.user_cards;
create policy "user_cards_delete_own"
on public.user_cards for delete
using (user_id = auth.uid());

drop policy if exists "user_progress_select_own" on public.user_progress;
create policy "user_progress_select_own"
on public.user_progress for select
using (user_id = auth.uid());

drop policy if exists "user_progress_insert_own" on public.user_progress;
create policy "user_progress_insert_own"
on public.user_progress for insert
with check (user_id = auth.uid());

drop policy if exists "user_progress_update_own" on public.user_progress;
create policy "user_progress_update_own"
on public.user_progress for update
using (user_id = auth.uid());

drop policy if exists "user_progress_delete_own" on public.user_progress;
create policy "user_progress_delete_own"
on public.user_progress for delete
using (user_id = auth.uid());

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
on public.user_settings for select
using (user_id = auth.uid());

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own"
on public.user_settings for insert
with check (user_id = auth.uid());

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
on public.user_settings for update
using (user_id = auth.uid());

drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_delete_own"
on public.user_settings for delete
using (user_id = auth.uid());

drop policy if exists "user_review_log_select_own" on public.user_review_log;
create policy "user_review_log_select_own"
on public.user_review_log for select
using (user_id = auth.uid());

drop policy if exists "user_review_log_insert_own" on public.user_review_log;
create policy "user_review_log_insert_own"
on public.user_review_log for insert
with check (user_id = auth.uid());

drop policy if exists "user_review_log_delete_own" on public.user_review_log;
create policy "user_review_log_delete_own"
on public.user_review_log for delete
using (user_id = auth.uid());
