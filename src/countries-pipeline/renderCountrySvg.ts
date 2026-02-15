import type * as GeoJSON from 'geojson'
import { geoEquirectangular, geoPath } from 'd3-geo'
import { bboxIntersects, bboxPadAndMinExtent, bboxToMultiPoint, computeBboxUnwrapped } from './geo.js'
import type { CountryFeature, RenderMeta } from './types.js'

const SIZE = 1000
// Bigger margin => slightly more "dezoom" and less risk of clipping at edges.
const MARGIN = 35

const COLORS = {
  otherFill: '#C7C7C7',
  targetFill: '#FFFFFF',
  stroke: '#8A8A8A',
  water: '#4EADE6'
} as const

const STROKE = {
  others: 1.0,
  // Make borders more readable on the card UI.
  all: 1.8,
  target: 2.6
} as const

export type RenderResult = {
  svg: string
  meta: RenderMeta
}

export function renderCountrySvg(
  countries: CountryFeature[],
  targetIso2: string,
  opts?: {
    paddingPct?: number
    minExtentDeg?: number
    theme?: 'transparent' | 'blue'
  }
): RenderResult {
  const paddingPct = opts?.paddingPct ?? 0.25
  const minExtentDeg = opts?.minExtentDeg ?? 2
  const theme = opts?.theme ?? 'transparent'

  const target = countries.find((c) => c.iso2 === targetIso2)
  if (!target) throw new Error(`Target not found: ${targetIso2}`)

  const refLon = target.centroid[0]
  const padded = bboxPadAndMinExtent(
    // Recompute bbox in the same unwrapped space we will use for intersection tests.
    computeBboxUnwrapped(target.feature.geometry, refLon),
    paddingPct,
    minExtentDeg
  )

  const visible: CountryFeature[] = []
  for (const c of countries) {
    const bb = computeBboxUnwrapped(c.feature.geometry, refLon)
    if (bboxIntersects(bb, padded)) visible.push(c)
  }

  // Stable rendering order: non-target first (iso2), target last.
  const others = visible.filter((c) => c.iso2 !== targetIso2).sort((a, b) => a.iso2.localeCompare(b.iso2))

  const projection = geoEquirectangular()
    .rotate([-refLon, 0])
    // Smaller => more resampling => smoother/more detailed borders.
    .precision(0.02)
    .fitExtent(
      [
        [MARGIN, MARGIN],
        [SIZE - MARGIN, SIZE - MARGIN]
      ],
      bboxToMultiPoint(padded) as unknown as GeoJSON.GeoJSON
    )

  const path = geoPath(projection)

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="geometricPrecision">`
  )

  if (theme === 'blue') {
    parts.push(`<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${COLORS.water}"/>`)
  }

  // Fill layer (no stroke): keeps colors clean.
  parts.push(`<g fill="${COLORS.otherFill}" stroke="none">`)
  for (const c of others) {
    const d = path(c.feature as unknown as GeoJSON.GeoJSON)
    if (!d) continue
    parts.push(`<path id="country-${c.iso2}" d="${d}"/>`)
  }
  parts.push(`</g>`)

  const targetD = path(target.feature as unknown as GeoJSON.GeoJSON)
  if (!targetD) throw new Error(`Target path is empty for ${targetIso2}`)

  parts.push(`<path id="country-${target.iso2}" class="target" d="${targetD}" fill="${COLORS.targetFill}" stroke="none"/>`)

  // Borders layer: draw borders for all visible countries (including the target) on top.
  parts.push(
    `<g fill="none" stroke="${COLORS.stroke}" stroke-width="${STROKE.all}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke">`
  )
  for (const c of others) {
    const d = path(c.feature as unknown as GeoJSON.GeoJSON)
    if (!d) continue
    parts.push(`<path d="${d}"/>`)
  }
  parts.push(`<path d="${targetD}"/>`)
  parts.push(`</g>`)

  // Target emphasis: slightly thicker border for the target only.
  parts.push(
    `<path d="${targetD}" fill="none" stroke="${COLORS.stroke}" stroke-width="${STROKE.target}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`
  )

  parts.push(`</svg>`)

  const targetBounds = path.bounds(target.feature as unknown as GeoJSON.GeoJSON)

  return {
    svg: parts.join(''),
    meta: {
      iso2: target.iso2,
      iso3: target.iso3,
      name_en: target.name_en,
      name_fr: target.name_fr,
      centroid: { lon: target.centroid[0], lat: target.centroid[1] },
      bbox: {
        lonLat_raw: target.bbox_raw,
        lonLat_unwrapped: target.bbox_unwrapped,
        lon_ref: target.bbox_unwrapped_ref,
        lonLat_padded_unwrapped: padded,
        padding_pct: paddingPct,
        min_extent_deg: minExtentDeg
      },
      projected: {
        viewBox: [0, 0, SIZE, SIZE],
        target_bounds: targetBounds
      }
    }
  }
}
