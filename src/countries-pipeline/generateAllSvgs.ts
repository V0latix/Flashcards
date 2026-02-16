import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import './env.js'
import { downloadNaturalEarthAdmin0Countries } from './downloadNaturalEarth.js'
import { loadCountriesFromShapefile } from './loadCountries.js'
import { OUT_DIR, OUT_SVG_BLUE_DIR, OUT_SVG_DIR, ensureDirs } from './paths.js'
import { renderCountrySvg } from './renderCountrySvg.js'
import type { RenderMeta } from './types.js'
import { isMainModule } from './isMain.js'

function shouldExcludeAntarctica(): boolean {
  const v = process.env.COUNTRIES_EXCLUDE_ANTARCTICA
  return v === undefined || v === '1' || v.toLowerCase() === 'true'
}

export async function generateAllSvgs(): Promise<{ generated: number; skipped: number }> {
  await ensureDirs()

  const { shpPath } = await downloadNaturalEarthAdmin0Countries()
  const countries = await loadCountriesFromShapefile(shpPath)

  const paddingPct = (() => {
    const v = (process.env.COUNTRIES_PADDING_PCT ?? '').trim()
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : 0.35
  })()

  const metas: Record<string, RenderMeta> = {}

  let generated = 0
  let skipped = 0
  let skippedDupIso2 = 0
  const seenIso2 = new Set<string>()

  for (const c of countries) {
    // Some Natural Earth variants include multiple features with the same ISO2 (e.g. dependencies/territories).
    // We only keep one SVG per ISO2 (deterministic file name), so skip duplicates to avoid silent overwrites.
    if (seenIso2.has(c.iso2)) {
      skippedDupIso2++
      continue
    }
    seenIso2.add(c.iso2)

    if (shouldExcludeAntarctica() && c.iso3 === 'ATA') {
      skipped++
      continue
    }

    // Zoom around the country with some context.
    const { svg, meta } = renderCountrySvg(countries, c.iso2, { paddingPct, minExtentDeg: 2 })
    const { svg: svgBlue } = renderCountrySvg(countries, c.iso2, {
      paddingPct,
      minExtentDeg: 2,
      theme: 'blue'
    })

    // Sanity check: target country must exist as a white-filled path.
    if (!svg.includes('class="target"') || !svg.includes('fill="#FFFFFF"')) {
      throw new Error(`SVG check failed for ${c.iso2}: missing target white path`)
    }

    const outPath = join(OUT_SVG_DIR, `${c.iso2}.svg`)
    await writeFile(outPath, svg, 'utf8')
    const outPathBlue = join(OUT_SVG_BLUE_DIR, `${c.iso2}.svg`)
    await writeFile(outPathBlue, svgBlue, 'utf8')
    metas[c.iso2] = meta
    generated++
  }

  const metaPath = join(OUT_DIR, 'countries.meta.json')
  await writeFile(metaPath, JSON.stringify({ generated_at: new Date().toISOString(), metas }, null, 2), 'utf8')

  await writeFile(join(OUT_DIR, 'preview.html'), buildPreviewHtml(Object.keys(metas).sort()), 'utf8')

  if (skippedDupIso2 > 0) {
    console.log(`generateAllSvgs: skipped ${skippedDupIso2} duplicate ISO2 features`)
  }

  return { generated, skipped }
}

function buildPreviewHtml(iso2List: string[]): string {
  const items = iso2List
    .map((iso2) => {
      const srcBlue = `svg-blue/${iso2}.svg`
      return `<a class="card" href="${srcBlue}" target="_blank" rel="noreferrer"><img loading="lazy" src="${srcBlue}" alt="${iso2}"/><div class="label">${iso2}</div></a>`
    })
    .join('')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Country SVG Preview</title>
    <style>
      :root { --bg: #0f1115; --panel: #171a21; --text: #e8e8e8; --muted: #9aa4b2; }
      body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
             background: radial-gradient(1200px 800px at 20% 10%, #1c2230, transparent), var(--bg); color: var(--text); }
      header { position: sticky; top: 0; backdrop-filter: blur(8px); background: rgba(15,17,21,0.7);
               border-bottom: 1px solid rgba(255,255,255,0.08); padding: 14px 16px; }
      .hint { color: var(--muted); font-size: 12px; }
      main { padding: 16px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
      .card { display: block; text-decoration: none; color: inherit; background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
      .card:hover { border-color: rgba(255,255,255,0.18); transform: translateY(-1px); transition: 120ms ease; }
      img { width: 100%; height: 140px; object-fit: contain; background: rgba(255,255,255,0.03); display: block; }
      .label { padding: 10px 12px; font-size: 12px; letter-spacing: 0.08em; color: var(--muted); }
    </style>
  </head>
  <body>
    <header>
      <div>Country SVG Preview</div>
      <div class="hint">Open this file: out/preview.html (images are loaded from out/svg/)</div>
    </header>
    <main>
      <div class="grid">${items}</div>
    </main>
  </body>
</html>`
}

if (isMainModule(import.meta.url)) {
  const res = await generateAllSvgs()
  console.log(`Generated: ${res.generated} SVGs, skipped: ${res.skipped}`)
}
