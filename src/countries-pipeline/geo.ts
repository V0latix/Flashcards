import type * as GeoJSON from 'geojson'
import type { BBox } from './types.js'

export function unwrapLon(lon: number, refLon: number): number {
  let x = lon
  while (x - refLon > 180) x -= 360
  while (x - refLon < -180) x += 360
  return x
}

export function computeBboxRaw(geom: GeoJSON.Geometry): BBox {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity

  const visit = (lon: number, lat: number) => {
    if (lon < minLon) minLon = lon
    if (lat < minLat) minLat = lat
    if (lon > maxLon) maxLon = lon
    if (lat > maxLat) maxLat = lat
  }

  const walk = (g: GeoJSON.Geometry) => {
    if (g.type === 'Polygon') {
      g.coordinates.forEach((ring) => ring.forEach(([lon, lat]) => visit(lon, lat)))
      return
    }
    if (g.type === 'MultiPolygon') {
      g.coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach(([lon, lat]) => visit(lon, lat))))
      return
    }
    if (g.type === 'GeometryCollection') {
      g.geometries.forEach(walk)
      return
    }
    // Ignore non-area geometries for this dataset
  }

  walk(geom)

  if (!Number.isFinite(minLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLon) || !Number.isFinite(maxLat)) {
    return [0, 0, 0, 0]
  }

  return [minLon, minLat, maxLon, maxLat]
}

export function computeBboxUnwrapped(geom: GeoJSON.Geometry, refLon: number): BBox {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity

  const visit = (lon: number, lat: number) => {
    const x = unwrapLon(lon, refLon)
    if (x < minLon) minLon = x
    if (lat < minLat) minLat = lat
    if (x > maxLon) maxLon = x
    if (lat > maxLat) maxLat = lat
  }

  const walk = (g: GeoJSON.Geometry) => {
    if (g.type === 'Polygon') {
      g.coordinates.forEach((ring) => ring.forEach(([lon, lat]) => visit(lon, lat)))
      return
    }
    if (g.type === 'MultiPolygon') {
      g.coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach(([lon, lat]) => visit(lon, lat))))
      return
    }
    if (g.type === 'GeometryCollection') {
      g.geometries.forEach(walk)
      return
    }
  }

  walk(geom)

  if (!Number.isFinite(minLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLon) || !Number.isFinite(maxLat)) {
    return [0, 0, 0, 0]
  }

  return [minLon, minLat, maxLon, maxLat]
}

export function bboxIntersects(a: BBox, b: BBox): boolean {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3])
}

export function bboxPadAndMinExtent(bbox: BBox, padPct: number, minExtentDeg: number): BBox {
  const [minX, minY, maxX, maxY] = bbox
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const w0 = Math.max(maxX - minX, minExtentDeg)
  const h0 = Math.max(maxY - minY, minExtentDeg)

  const w = w0 * (1 + 2 * padPct)
  const h = h0 * (1 + 2 * padPct)

  return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]
}

export function bboxToPolygon(b: BBox): GeoJSON.Feature<GeoJSON.Polygon> {
  const [minX, minY, maxX, maxY] = b
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
          [minX, minY]
        ]
      ]
    }
  }
}

export function bboxToMultiPoint(b: BBox): GeoJSON.Feature<GeoJSON.MultiPoint> {
  const [minX, minY, maxX, maxY] = b
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiPoint',
      coordinates: [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY]
      ]
    }
  }
}
