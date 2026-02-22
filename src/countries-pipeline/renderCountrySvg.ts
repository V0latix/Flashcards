import type * as GeoJSON from 'geojson'
import { geoCentroid, geoNaturalEarth1, geoPath } from 'd3-geo'
import { bboxIntersects, bboxPadAndMinExtent, bboxToMultiPoint, computeBboxRaw, computeBboxUnwrapped, unwrapLon } from './geo.js'
import type { BBox, CountryFeature, RenderMeta } from './types.js'

const SIZE = 1000
const MARGIN = 25

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

type AtlasRegion = {
  id: string
  refLon: number
  frame: BBox
}

const PACIFIC_ISLANDS_GLOBAL: AtlasRegion = {
  id: 'pacific_islands_global',
  refLon: 170,
  // Global Pacific view centered on oceanic islands (unwrapped longitude space).
  frame: [120, -35, 250, 30]
}

const PACIFIC_ISLAND_ISO2 = new Set([
  'AS',
  'CK',
  'FJ',
  'FM',
  'GU',
  'KI',
  'MH',
  'MP',
  'NC',
  'NF',
  'NR',
  'NU',
  'PF',
  'PG',
  'PN',
  'PW',
  'SB',
  'TK',
  'TO',
  'TV',
  'VU',
  'WF',
  'WS'
])

const ATLAS_REGIONS: AtlasRegion[] = [
  PACIFIC_ISLANDS_GLOBAL,
  // Prioritize a dedicated Caribbean frame so islands don't fall back to a wide Americas view.
  { id: 'caribbean', refLon: -69, frame: [-83, 10, -58, 25] },
  { id: 'north_america', refLon: -100, frame: [-170, 5, -45, 83] },
  { id: 'south_america', refLon: -62, frame: [-92, -60, -28, 16] },
  // Split Europe for a tighter zoom than the previous single large frame.
  { id: 'europe_west', refLon: 9, frame: [-22, 36, 24, 70] },
  // Slightly wider to the west so countries like Bulgaria fit entirely.
  { id: 'europe_east', refLon: 40, frame: [20, 34, 70, 72] },
  { id: 'africa', refLon: 20, frame: [-25, -40, 60, 40] },
  { id: 'west_asia', refLon: 75, frame: [30, 0, 125, 55] },
  { id: 'east_asia', refLon: 120, frame: [90, -5, 160, 60] },
  { id: 'oceania', refLon: 160, frame: [105, -55, 200, 20] }
]

export type RenderResult = {
  svg: string
  meta: RenderMeta
}

type RenderOptions = {
  paddingPct?: number
  minExtentDeg?: number
  theme?: 'transparent' | 'blue'
  marginPx?: number
  mode?: 'zoom' | 'atlas'
}

function geometryToMultiPolygonCoordinates(geometry: GeoJSON.Geometry): number[][][][] {
  if (geometry.type === 'Polygon') return [geometry.coordinates]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates
  if (geometry.type === 'GeometryCollection') {
    const out: number[][][][] = []
    for (const g of geometry.geometries) out.push(...geometryToMultiPolygonCoordinates(g))
    return out
  }
  return []
}

function mergeCountryGroup(group: CountryFeature[]): CountryFeature {
  if (group.length === 1) return group[0]
  const base = group[0]
  const coordinates: number[][][][] = []
  for (const c of group) {
    coordinates.push(...geometryToMultiPolygonCoordinates(c.feature.geometry))
  }

  const mergedGeometry: GeoJSON.MultiPolygon = { type: 'MultiPolygon', coordinates }
  const mergedFeature: GeoJSON.Feature<GeoJSON.MultiPolygon, Record<string, unknown>> = {
    type: 'Feature',
    properties: { ...(base.feature.properties ?? {}) },
    geometry: mergedGeometry
  }

  const centroid = geoCentroid(mergedFeature as unknown as GeoJSON.GeoJSON) as [number, number]
  const bbox_raw = computeBboxRaw(mergedGeometry)
  const ref = centroid[0]
  const bbox_unwrapped = computeBboxUnwrapped(mergedGeometry, ref)

  return {
    ...base,
    feature: mergedFeature,
    centroid,
    bbox_raw,
    bbox_unwrapped_ref: ref,
    bbox_unwrapped
  }
}

function aggregateCountriesByIso2(countries: CountryFeature[]): CountryFeature[] {
  const byIso2 = new Map<string, CountryFeature[]>()
  for (const c of countries) {
    const list = byIso2.get(c.iso2)
    if (list) list.push(c)
    else byIso2.set(c.iso2, [c])
  }

  return [...byIso2.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, group]) => mergeCountryGroup(group))
}

function findTarget(countries: CountryFeature[], targetIso2: string): CountryFeature {
  const target = countries.find((c) => c.iso2 === targetIso2)
  if (!target) throw new Error(`Target not found: ${targetIso2}`)
  return target
}

function selectRegionForTarget(target: CountryFeature): AtlasRegion {
  if (PACIFIC_ISLAND_ISO2.has(target.iso2)) return PACIFIC_ISLANDS_GLOBAL

  const [lon, lat] = target.centroid
  for (const region of ATLAS_REGIONS) {
    const lonU = unwrapLon(lon, region.refLon)
    const [minX, minY, maxX, maxY] = region.frame
    if (lonU >= minX && lonU <= maxX && lat >= minY && lat <= maxY) return region
  }

  // Fallback: nearest region center.
  let best = ATLAS_REGIONS[0]
  let bestDist = Infinity
  for (const region of ATLAS_REGIONS) {
    const [minX, minY, maxX, maxY] = region.frame
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const lonU = unwrapLon(lon, region.refLon)
    const dx = lonU - cx
    const dy = lat - cy
    const dist2 = dx * dx + dy * dy
    if (dist2 < bestDist) {
      bestDist = dist2
      best = region
    }
  }
  return best
}

function targetMarkerSvg(
  targetBounds: [[number, number], [number, number]],
  targetCenter?: [number, number] | null,
  targetProjectedArea?: number
): string {
  const [[x0, y0], [x1, y1]] = targetBounds
  const w = Math.max(0, x1 - x0)
  const h = Math.max(0, y1 - y0)
  const minDim = Math.min(w, h)
  const maxDim = Math.max(w, h)
  const boundsArea = w * h
  const projectedArea = Math.max(0, targetProjectedArea ?? 0)
  const fillRatio = boundsArea > 0 ? projectedArea / boundsArea : 0

  // Handle far-apart tiny islands (large bbox, tiny actual filled area).
  const shouldMark =
    maxDim <= 34 ||
    minDim <= 14 ||
    boundsArea <= 1600 ||
    projectedArea <= 2200 ||
    (projectedArea <= 6000 && fillRatio <= 0.08)
  if (!shouldMark) return ''

  const cx = targetCenter?.[0] ?? (x0 + x1) / 2
  const cy = targetCenter?.[1] ?? (y0 + y1) / 2
  const tinyBoost = projectedArea <= 300 ? 18 : projectedArea <= 1200 ? 12 : 8
  const base = Math.max(maxDim * 0.7, 10)
  const r = Math.max(22, Math.min(54, base + tinyBoost))
  const outerR = r + 5
  return [
    // Visible zone for tiny islands/micro-states: soft filled disc + strong contour.
    `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="#FF4D4D" opacity="0.24"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="none" stroke="#7A0A0A" stroke-width="6.5" opacity="0.86"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="none" stroke="#FF6B6B" stroke-width="3.8" opacity="1"/>`,
    `<circle cx="${cx}" cy="${cy}" r="2.8" fill="#B30000" opacity="0.98"/>`
  ].join('')
}

function renderAtlas(
  countries: CountryFeature[],
  targetIso2: string,
  theme: 'transparent' | 'blue',
  marginPx: number
): RenderResult {
  const target = findTarget(countries, targetIso2)
  const region = selectRegionForTarget(target)

  const projection = geoNaturalEarth1()
    .rotate([-region.refLon, 0])
    .precision(0.02)
    .fitExtent(
      [
        [marginPx, marginPx],
        [SIZE - marginPx, SIZE - marginPx]
      ],
      bboxToMultiPoint(region.frame) as unknown as GeoJSON.GeoJSON
    )
    // Hard clip to viewport to avoid long offscreen segments and fill artifacts near antimeridian.
    .clipExtent([
      [0, 0],
      [SIZE, SIZE]
    ])

  const path = geoPath(projection)
  const targetDCheck = path(target.feature as unknown as GeoJSON.GeoJSON)
  if (!targetDCheck) {
    // Fallback for remote territories that may not fit any fixed atlas frame.
    return renderZoom(countries, targetIso2, 0.4, 2, theme, marginPx)
  }
  const visible: CountryFeature[] = []
  for (const c of countries) {
    const d = path(c.feature as unknown as GeoJSON.GeoJSON)
    if (!d) continue
    const [[x0, y0], [x1, y1]] = path.bounds(c.feature as unknown as GeoJSON.GeoJSON)
    if (x1 < 0 || y1 < 0 || x0 > SIZE || y0 > SIZE) continue
    visible.push(c)
  }
  const others = visible.filter((c) => c.iso2 !== targetIso2).sort((a, b) => a.iso2.localeCompare(b.iso2))

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="geometricPrecision">`
  )

  if (theme === 'blue') {
    parts.push(`<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${COLORS.water}"/>`)
  }

  parts.push(`<g fill="${COLORS.otherFill}" stroke="none">`)
  for (const c of others) {
    const d = path(c.feature as unknown as GeoJSON.GeoJSON)
    if (!d) continue
    parts.push(`<path id="country-${c.iso2}" d="${d}"/>`)
  }
  parts.push(`</g>`)

  const targetD = targetDCheck
  parts.push(`<path id="country-${target.iso2}" class="target" d="${targetD}" fill="${COLORS.targetFill}" stroke="none"/>`)

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

  parts.push(
    `<path d="${targetD}" fill="none" stroke="${COLORS.stroke}" stroke-width="${STROKE.target}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`
  )

  const targetBounds = path.bounds(target.feature as unknown as GeoJSON.GeoJSON)
  const targetProjectedArea = path.area(target.feature as unknown as GeoJSON.GeoJSON)
  const centerByPath = path.centroid(target.feature as unknown as GeoJSON.GeoJSON)
  const fallbackCenter = projection(target.centroid as [number, number])
  const targetCenter =
    Number.isFinite(centerByPath[0]) && Number.isFinite(centerByPath[1]) ? centerByPath : fallbackCenter
  const marker = targetMarkerSvg(targetBounds, targetCenter as [number, number] | null, targetProjectedArea)
  if (marker) parts.push(marker)

  parts.push(`</svg>`)

  const targetBboxInRegionRef = computeBboxUnwrapped(target.feature.geometry, region.refLon)

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
        lonLat_unwrapped: targetBboxInRegionRef,
        lon_ref: region.refLon,
        lonLat_padded_unwrapped: region.frame,
        padding_pct: 0,
        min_extent_deg: 0
      },
      projected: {
        viewBox: [0, 0, SIZE, SIZE],
        target_bounds: targetBounds
      }
    }
  }
}

function renderZoom(
  countries: CountryFeature[],
  targetIso2: string,
  paddingPct: number,
  minExtentDeg: number,
  theme: 'transparent' | 'blue',
  marginPx: number
): RenderResult {
  const target = findTarget(countries, targetIso2)

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

  const projection = geoNaturalEarth1()
    .rotate([-refLon, 0])
    // Smaller => more resampling => smoother/more detailed borders.
    .precision(0.02)
    .fitExtent(
      [
        [marginPx, marginPx],
        [SIZE - marginPx, SIZE - marginPx]
      ],
      bboxToMultiPoint(padded) as unknown as GeoJSON.GeoJSON
    )
    .clipExtent([
      [0, 0],
      [SIZE, SIZE]
    ])

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

  const targetBounds = path.bounds(target.feature as unknown as GeoJSON.GeoJSON)
  const targetProjectedArea = path.area(target.feature as unknown as GeoJSON.GeoJSON)
  const centerByPath = path.centroid(target.feature as unknown as GeoJSON.GeoJSON)
  const fallbackCenter = projection(target.centroid as [number, number])
  const targetCenter =
    Number.isFinite(centerByPath[0]) && Number.isFinite(centerByPath[1]) ? centerByPath : fallbackCenter
  const marker = targetMarkerSvg(targetBounds, targetCenter as [number, number] | null, targetProjectedArea)
  if (marker) parts.push(marker)

  parts.push(`</svg>`)

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

export function renderCountrySvg(
  countries: CountryFeature[],
  targetIso2: string,
  opts?: RenderOptions
): RenderResult {
  const mergedCountries = aggregateCountriesByIso2(countries)
  const mode = opts?.mode ?? 'atlas'
  const paddingPct = opts?.paddingPct ?? 0.25
  const minExtentDeg = opts?.minExtentDeg ?? 2
  const theme = opts?.theme ?? 'transparent'
  const marginPx = opts?.marginPx ?? MARGIN

  if (mode === 'zoom') return renderZoom(mergedCountries, targetIso2, paddingPct, minExtentDeg, theme, marginPx)
  return renderAtlas(mergedCountries, targetIso2, theme, marginPx)
}
