import { cleanupMathPacks } from './cleanupMathPacks.js'
import { seedCountriesLocationPack } from './seedCountriesLocationPack.js'
import { isMainModule } from './isMain.js'
import './env.js'

export async function pipelineGeoPack() {
  const cleanup = await cleanupMathPacks()
  const seed = await seedCountriesLocationPack()

  console.log('--- Geo Pack Pipeline ---')
  console.log(`math_cards_deleted: ${cleanup.cards_deleted}`)
  console.log(`math_packs_deleted: ${cleanup.packs_deleted}`)
  for (const pack of seed.packs) {
    console.log(`pack_slug: ${pack.pack_slug}`)
    console.log(`cards_upserted: ${pack.cards_upserted}`)
    console.log(`cards_deleted_in_pack: ${pack.cards_deleted}`)
  }
}

if (isMainModule(import.meta.url)) {
  await pipelineGeoPack()
}
