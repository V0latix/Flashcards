import { getSupabase } from './supabase'

export type PackRow = {
  id: number | string
  slug: string
  title: string | null
  description: string | null
  tags: string[] | null
}

export type PublicCardRow = {
  id: number | string
  pack_slug: string | null
  front_md: string | null
  back_md: string | null
  tags: string[] | null
}

export const listPacks = async (): Promise<PackRow[]> => {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('packs')
    .select('id, slug, title, description, tags')
    .order('title', { ascending: true })

  if (error) {
    throw new Error(`packs: ${error.message}`)
  }

  return (data ?? []) as PackRow[]
}

export const listPublicCardsByPackSlug = async (slug: string): Promise<PublicCardRow[]> => {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('public_cards')
    .select('id, pack_slug, front_md, back_md, tags')
    .eq('pack_slug', slug)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`public_cards: ${error.message}`)
  }

  return (data ?? []) as PublicCardRow[]
}
