-- Optional helper SQL for the countries pipeline.
-- The Node pipeline (`npm run seed:countries`) will create this table automatically
-- when `SUPABASE_DB_URL` is set, but you can also apply this manually.

create table if not exists public.countries (
  iso2 text primary key,
  iso3 text,
  name_en text not null,
  name_fr text,
  image_url text,
  bbox jsonb,
  centroid jsonb
);

