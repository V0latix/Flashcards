import type * as GeoJSON from 'geojson'
import { geoMercator, geoPath } from 'd3-geo'
import type { DepartementFeature, RenderMeta } from './types.js'

const SIZE = 1000
const MARGIN = 24
const METRO_BOTTOM = 775

const COLORS = {
  background: '#E7EBF0',
  otherFill: '#C8CCD2',
  targetFill: '#FFFFFF',
  stroke: '#8A939F'
} as const

const STROKE = {
  all: 2.1,
  target: 2.8
} as const

const DROM_INSETS: Record<string, [[number, number], [number, number]]> = {
  '971': [
    [80, 812],
    [190, 948]
  ],
  '972': [
    [204, 812],
    [314, 948]
  ],
  '973': [
    [328, 812],
    [478, 948]
  ],
  '974': [
    [492, 812],
    [602, 948]
  ],
  '976': [
    [616, 812],
    [726, 948]
  ]
}

export type RenderResult = {
  svg: string
  meta: RenderMeta
}

function isDromCode(code: string): code is keyof typeof DROM_INSETS {
  return code in DROM_INSETS
}

function featureCollection(features: DepartementFeature[]): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
  return {
    type: 'FeatureCollection',
    features: features.map((d) => d.feature as unknown as GeoJSON.Feature<GeoJSON.Geometry>)
  }
}

function buildStaticLayout(departements: DepartementFeature[]) {
  const paths = new Map<string, string>()
  const bounds = new Map<string, [[number, number], [number, number]]>()

  const metro = departements.filter((d) => !isDromCode(d.code))
  const metroProjection = geoMercator().fitExtent(
    [
      [MARGIN, MARGIN],
      [SIZE - MARGIN, METRO_BOTTOM]
    ],
    featureCollection(metro) as unknown as GeoJSON.GeoJSON
  )
  const metroPath = geoPath(metroProjection)

  for (const d of metro) {
    const p = metroPath(d.feature as unknown as GeoJSON.GeoJSON)
    if (!p) continue
    paths.set(d.code, p)
    bounds.set(d.code, metroPath.bounds(d.feature as unknown as GeoJSON.GeoJSON))
  }

  const drom = departements.filter((d) => isDromCode(d.code))
  for (const d of drom) {
    const inset = DROM_INSETS[d.code]
    const p = geoPath(
      geoMercator().fitExtent(inset, d.feature as unknown as GeoJSON.GeoJSON)
    )
    const dPath = p(d.feature as unknown as GeoJSON.GeoJSON)
    if (!dPath) continue
    paths.set(d.code, dPath)
    bounds.set(d.code, p.bounds(d.feature as unknown as GeoJSON.GeoJSON))
  }

  const orderedCodes = departements
    .map((d) => d.code)
    .filter((c) => paths.has(c))
    .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))

  return { paths, bounds, orderedCodes }
}

export function renderDepartementSvg(
  departements: DepartementFeature[],
  targetCode: string,
  opts?: { paddingPct?: number; minExtentDeg?: number; marginPx?: number }
): RenderResult {
  const target = departements.find((d) => d.code === targetCode)
  if (!target) throw new Error(`Target departement not found: ${targetCode}`)

  const layout = buildStaticLayout(departements)
  const targetPath = layout.paths.get(targetCode)
  if (!targetPath) throw new Error(`Target path is empty for ${targetCode}`)

  const others = layout.orderedCodes.filter((code) => code !== targetCode)
  const parts: string[] = []

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="geometricPrecision">`
  )
  parts.push(`<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${COLORS.background}"/>`)

  parts.push(`<g fill="${COLORS.otherFill}" stroke="none">`)
  for (const code of others) {
    const p = layout.paths.get(code)
    if (!p) continue
    parts.push(`<path id="departement-${code}" d="${p}"/>`)
  }
  parts.push(`</g>`)

  parts.push(
    `<path id="departement-${target.code}" class="target" d="${targetPath}" fill="${COLORS.targetFill}" stroke="none"/>`
  )

  parts.push(
    `<g fill="none" stroke="${COLORS.stroke}" stroke-width="${STROKE.all}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke">`
  )
  for (const code of others) {
    const p = layout.paths.get(code)
    if (!p) continue
    parts.push(`<path d="${p}"/>`)
  }
  parts.push(`<path d="${targetPath}"/>`)
  parts.push(`</g>`)

  parts.push(
    `<path d="${targetPath}" fill="none" stroke="${COLORS.stroke}" stroke-width="${STROKE.target}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`
  )

  parts.push(`</svg>`)

  const targetBounds = layout.bounds.get(target.code) ?? [
    [0, 0],
    [0, 0]
  ]

  return {
    svg: parts.join(''),
    meta: {
      code: target.code,
      name: target.name,
      centroid: { lon: target.centroid[0], lat: target.centroid[1] },
      bbox: {
        lonLat_raw: target.bbox_raw,
        lonLat_unwrapped: target.bbox_unwrapped,
        lon_ref: target.bbox_unwrapped_ref,
        lonLat_padded_unwrapped: target.bbox_unwrapped,
        padding_pct: opts?.paddingPct ?? 0,
        min_extent_deg: opts?.minExtentDeg ?? 0
      },
      projected: {
        viewBox: [0, 0, SIZE, SIZE],
        target_bounds: targetBounds
      }
    }
  }
}
