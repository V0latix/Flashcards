begin;

-- 1) Remove redundant index on departements.numero
drop index if exists public.idx_departements_numero;

-- 2) Remove unused counters from user_progress
alter table public.user_progress
  drop column if exists correct_count,
  drop column if exists wrong_count;

-- 3) Remove unused hint column from cloud cards
alter table public.user_cards
  drop column if exists hint_md;

-- 4) Normalize countries key to country_code only
drop index if exists public.countries_iso2_key;
alter table public.countries
  drop column if exists iso2;

commit;
