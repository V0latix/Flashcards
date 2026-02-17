import type * as GeoJSON from 'geojson'

export type BBox = [minX: number, minY: number, maxX: number, maxY: number]

export type DepartementFeature = {
  code: string
  name: string
  feature: GeoJSON.Feature<GeoJSON.Geometry, Record<string, unknown>>
  centroid: [lon: number, lat: number]
  bbox_raw: BBox
  bbox_unwrapped_ref: number
  bbox_unwrapped: BBox
}

export type RenderMeta = {
  code: string
  name: string
  centroid: { lon: number; lat: number }
  bbox: {
    lonLat_raw: BBox
    lonLat_unwrapped: BBox
    lon_ref: number
    lonLat_padded_unwrapped: BBox
    padding_pct: number
    min_extent_deg: number
  }
  projected: {
    viewBox: BBox
    target_bounds: [[number, number], [number, number]]
  }
}
