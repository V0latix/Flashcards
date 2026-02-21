create table if not exists public.daily_cards_status (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, day),
  constraint daily_cards_status_done_at_check check (done or done_at is null)
);

create index if not exists daily_cards_status_day_idx on public.daily_cards_status (day);

create or replace function public.set_daily_cards_status_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_daily_cards_status_updated_at on public.daily_cards_status;
create trigger trg_daily_cards_status_updated_at
before update on public.daily_cards_status
for each row
execute function public.set_daily_cards_status_updated_at();

alter table public.daily_cards_status enable row level security;

grant select, insert, update on public.daily_cards_status to authenticated;

drop policy if exists "daily_cards_status_select_own" on public.daily_cards_status;
create policy "daily_cards_status_select_own"
on public.daily_cards_status
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "daily_cards_status_insert_own" on public.daily_cards_status;
create policy "daily_cards_status_insert_own"
on public.daily_cards_status
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "daily_cards_status_update_own" on public.daily_cards_status;
create policy "daily_cards_status_update_own"
on public.daily_cards_status
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
