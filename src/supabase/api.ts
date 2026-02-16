import { supabase } from './client'
import type { Pack, PublicCard } from './types'

const PAGE_SIZE = 1000

export async function listPacks(): Promise<Pack[]> {
  const { data, error } = await supabase
    .from('packs')
    .select('id, slug, title, description, tags')
    .order('title', { ascending: true })

  if (error) {
    throw new Error(`Supabase listPacks failed: ${error.message}`)
  }

  return (data ?? []) as Pack[]
}

export async function listPublicCardsByPackSlug(slug: string): Promise<PublicCard[]> {
  const rows: PublicCard[] = []
  let from = 0

  // Page through rows to avoid the default API cap (often 1000 rows/request).
  while (true) {
    const { data, error } = await supabase
      .from('public_cards')
      .select('id, pack_slug, front_md, back_md, tags')
      .eq('pack_slug', slug)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(`Supabase listPublicCardsByPackSlug failed: ${error.message}`)
    }

    const chunk = (data ?? []) as PublicCard[]
    rows.push(...chunk)

    if (chunk.length < PAGE_SIZE) {
      break
    }
    from += PAGE_SIZE
  }

  return rows
}
