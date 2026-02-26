create or replace function public.public_card_counts_by_pack()
returns table(pack_slug text, cards_count bigint)
language sql
stable
as $$
  select
    pc.pack_slug::text as pack_slug,
    count(*)::bigint as cards_count
  from public.public_cards pc
  group by pc.pack_slug
$$;

grant execute on function public.public_card_counts_by_pack() to anon, authenticated;
