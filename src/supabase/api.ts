import { supabase } from './client'
import type { Pack, PublicCard } from './types'

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
  const { data, error } = await supabase
    .from('public_cards')
    .select('id, pack_slug, front_md, back_md, tags')
    .eq('pack_slug', slug)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Supabase listPublicCardsByPackSlug failed: ${error.message}`)
  }

  return (data ?? []) as PublicCard[]
}
