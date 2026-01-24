export type Pack = {
  id: string
  slug: string
  title: string
  description: string | null
  tags: string[] | null
}

export type PublicCard = {
  id: string
  pack_slug: string
  front_md: string
  back_md: string
  tags: string[] | null
}
