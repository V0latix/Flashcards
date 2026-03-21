begin;

alter table public.user_cards
  add column if not exists suspended boolean not null default false;

create index if not exists user_cards_user_id_suspended_idx
  on public.user_cards (user_id, suspended);

commit;

select pg_notify('pgrst', 'reload schema');
