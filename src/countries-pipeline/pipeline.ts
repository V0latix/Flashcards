import './env.js'
import { generateAllSvgs } from './generateAllSvgs.js'
import { uploadAllCountrySvgs } from './uploadToSupabase.js'
import { seedCountries } from './seedCountries.js'
import { isMainModule } from './isMain.js'

export async function runPipeline() {
  const gen = await generateAllSvgs()
  const upload = await uploadAllCountrySvgs()
  const seed = await seedCountries()

  const examples = {
    FR: process.env.SUPABASE_URL
      ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/country-maps/svg/FR.svg`
      : '',
    US: process.env.SUPABASE_URL
      ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/country-maps/svg/US.svg`
      : '',
    JP: process.env.SUPABASE_URL
      ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/country-maps/svg/JP.svg`
      : ''
  }

  console.log('--- Pipeline Summary ---')
  console.log(`Generated SVGs: ${gen.generated} (skipped: ${gen.skipped})`)
  console.log(`Uploaded SVGs: base=${upload.uploaded_base} blue=${upload.uploaded_blue}`)
  console.log(`Upserted rows: ${seed.upserted}`)
  console.log(`Preview: out/preview.html`)
  console.log(`Example URLs:`)
  console.log(`- FR: ${examples.FR}`)
  console.log(`- US: ${examples.US}`)
  console.log(`- JP: ${examples.JP}`)
}

if (isMainModule(import.meta.url)) {
  await runPipeline()
}
