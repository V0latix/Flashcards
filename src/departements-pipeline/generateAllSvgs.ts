import { readdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import './env.js'
import { ensureDirs, OUT_DEPARTEMENTS_DIR, OUT_SVG_DIR } from './paths.js'
import { isMainModule } from './isMain.js'
import { downloadDepartementsGeojson } from './downloadDepartementsGeojson.js'
import { loadDepartementsFromGeojson } from './loadDepartements.js'
import { renderDepartementSvg } from './renderDepartementSvg.js'
import type { RenderMeta } from './types.js'

function getPaddingPct(): number {
  const raw = (process.env.DEPARTEMENTS_PADDING_PCT ?? '').trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0.5
}

function getMinExtentDeg(): number {
  const raw = (process.env.DEPARTEMENTS_MIN_EXTENT_DEG ?? '').trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 1.4
}

export async function generateAllDepartementSvgs(): Promise<{ generated: number }> {
  await ensureDirs()
  const { path: geojsonPath } = await downloadDepartementsGeojson()
  const departements = await loadDepartementsFromGeojson(geojsonPath)

  // Avoid stale SVGs when the source filter changes.
  const existing = await readdir(OUT_SVG_DIR)
  await Promise.all(
    existing.filter((f) => f.endsWith('.svg')).map((f) => unlink(join(OUT_SVG_DIR, f)))
  )

  const paddingPct = getPaddingPct()
  const minExtentDeg = getMinExtentDeg()

  const metas: Record<string, RenderMeta> = {}
  let generated = 0

  for (const d of departements) {
    const { svg, meta } = renderDepartementSvg(departements, d.code, { paddingPct, minExtentDeg })

    if (!svg.includes('class="target"') || !svg.includes('fill="#FFFFFF"')) {
      throw new Error(`SVG check failed for departement ${d.code}: missing highlighted target`)
    }

    await writeFile(join(OUT_SVG_DIR, `${d.code}.svg`), svg, 'utf8')
    metas[d.code] = meta
    generated += 1
  }

  await writeFile(
    join(OUT_DEPARTEMENTS_DIR, 'departements.meta.json'),
    JSON.stringify({ generated_at: new Date().toISOString(), metas }, null, 2),
    'utf8'
  )

  await writeFile(join(OUT_DEPARTEMENTS_DIR, 'preview.html'), buildPreviewHtml(Object.keys(metas).sort()), 'utf8')

  return { generated }
}

function buildPreviewHtml(codes: string[]): string {
  const items = codes
    .map(
      (code) =>
        `<a class="card" href="svg/${code}.svg" target="_blank" rel="noreferrer"><img loading="lazy" src="svg/${code}.svg" alt="${code}"/><div class="label">${code}</div></a>`
    )
    .join('')

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Départements SVG Preview</title>
    <style>
      :root { --bg: #0f1115; --panel: #171a21; --text: #e8e8e8; --muted: #9aa4b2; }
      body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
             background: radial-gradient(1200px 800px at 20% 10%, #1c2230, transparent), var(--bg); color: var(--text); }
      header { position: sticky; top: 0; backdrop-filter: blur(8px); background: rgba(15,17,21,0.7);
               border-bottom: 1px solid rgba(255,255,255,0.08); padding: 14px 16px; }
      .hint { color: var(--muted); font-size: 12px; }
      main { padding: 16px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
      .card { display: block; text-decoration: none; color: inherit; background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
      .card:hover { border-color: rgba(255,255,255,0.18); transform: translateY(-1px); transition: 120ms ease; }
      img { width: 100%; height: 140px; object-fit: contain; background: rgba(255,255,255,0.03); display: block; }
      .label { padding: 10px 12px; font-size: 12px; letter-spacing: 0.08em; color: var(--muted); }
    </style>
  </head>
  <body>
    <header>
      <div>Départements Français SVG Preview</div>
      <div class="hint">Ouvre ce fichier: out/departements/preview.html</div>
    </header>
    <main>
      <div class="grid">${items}</div>
    </main>
  </body>
</html>`
}

if (isMainModule(import.meta.url)) {
  const res = await generateAllDepartementSvgs()
  console.log(`Generated: ${res.generated} departement SVGs`)
}
