import type * as GeoJSON from "geojson";
import { geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
import {
  bboxIntersects,
  bboxPadAndMinExtent,
  bboxToMultiPoint,
  computeBboxRaw,
  computeBboxUnwrapped,
  unwrapLon,
} from "./geo.js";
import type { BBox, CountryFeature, RenderMeta } from "./types.js";

const SIZE = 1000;
const MARGIN = 25;

const COLORS = {
  otherFill: "#C7C7C7",
  targetFill: "#F97316",
  stroke: "#8A8A8A",
  water: "#4EADE6",
} as const;

const STROKE = {
  others: 1.0,
  // Make borders more readable on the card UI.
  all: 1.8,
  target: 2.6,
} as const;

type AtlasRegion = {
  id: string;
  refLon: number;
  frame: BBox;
};

const PACIFIC_ISLANDS_GLOBAL: AtlasRegion = {
  id: "pacific_islands_global",
  refLon: 170,
  // Slightly tighter Pacific framing for better island visibility.
  frame: [130, -30, 240, 24],
};

const SOUTHERN_INDIAN_OCEAN: AtlasRegion = {
  id: "southern_indian_ocean",
  refLon: 70,
  // Wider context for remote southern islands (e.g. French Southern Territories).
  frame: [15, -72, 140, -10],
};

const NORTH_INDIAN_OCEAN: AtlasRegion = {
  id: "north_indian_ocean",
  refLon: 74,
  // Dedicated regional window for Maldives with surrounding context (India, Sri Lanka, Arabian Sea).
  frame: [56, -5, 93, 23],
};

const SOUTHEAST_ASIA: AtlasRegion = {
  id: "southeast_asia",
  refLon: 118,
  // Wider regional context for Indonesia and neighbors (Malay Peninsula, Philippines, Papua).
  frame: [90, -18, 146, 24],
};

const NEW_ZEALAND_CONTEXT: AtlasRegion = {
  id: "new_zealand_context",
  refLon: 173,
  // Rectangular context window around New Zealand to avoid the previous oversized oval extent.
  frame: [156, -53, 191, -28],
};

const PACIFIC_ISLAND_ISO2 = new Set([
  "AS",
  "CK",
  "FJ",
  "FM",
  "GU",
  "KI",
  "MH",
  "MP",
  "NC",
  "NF",
  "NR",
  "NU",
  "PF",
  "PG",
  "PN",
  "PW",
  "SB",
  "TK",
  "TO",
  "TV",
  "VU",
  "WF",
  "WS",
]);

const SOUTHERN_ISLAND_ISO2 = new Set(["TF", "HM"]);

// Small island nations shown within the Africa atlas: stay in frame with forceZone ellipse.
const AFRICA_ISLAND_ISO2 = new Set(["SC"]);

// Maldives needs a dedicated Indian Ocean context frame.
const INDIAN_OCEAN_ISLAND_ISO2 = new Set(["MV"]);

// Small Antilles/Caribbean island nations: stay in the Caribbean atlas frame with forceZone ellipse,
// like Pacific island nations in the Oceania view.
const CARIBBEAN_ISLAND_ISO2 = new Set([
  "AG",
  "AW",
  "BB",
  "BL",
  "BQ",
  "CW",
  "DM",
  "GD",
  "GP",
  "KN",
  "KY",
  "LC",
  "MF",
  "MQ",
  "MS",
  "SX",
  "TC",
  "TT",
  "VC",
  "VG",
  "VI",
]);

// Islands shown within the North America atlas: stay in frame instead of falling back to zoom.
const NORTH_AMERICA_ISLAND_ISO2 = new Set(["BM"]);

// Use a dedicated Southeast Asia regional frame for better readability.
const SOUTHEAST_ASIA_ISO2 = new Set(["BN", "ID", "MY", "PH", "SG", "TL"]);

// Countries where the automatic archipelago ellipse should be disabled.
const NO_EXTENT_ELLIPSE_ISO2 = new Set(["NZ"]);

const ATLAS_REGIONS: AtlasRegion[] = [
  PACIFIC_ISLANDS_GLOBAL,
  // Prioritize a dedicated Caribbean frame so islands don't fall back to a wide Americas view.
  { id: "caribbean", refLon: -69, frame: [-83, 10, -58, 25] },
  // Slightly tighter framing for North America.
  { id: "north_america", refLon: -100, frame: [-165, 8, -50, 82] },
  { id: "south_america", refLon: -62, frame: [-92, -60, -28, 16] },
  // Split Europe for a tighter zoom than the previous single large frame.
  { id: "europe_west", refLon: 9, frame: [-22, 36, 24, 70] },
  // Slightly wider to the west so countries like Bulgaria fit entirely.
  { id: "europe_east", refLon: 40, frame: [20, 34, 70, 72] },
  // Africa must come before SOUTHERN_INDIAN_OCEAN: the Indian Ocean frame's lat range
  // [-72, -10] overlaps southern Africa, which would otherwise capture Angola, Botswana,
  // Madagascar, Mozambique, Namibia, South Africa, etc. in the wrong atlas view.
  { id: "africa", refLon: 20, frame: [-25, -40, 60, 40] },
  SOUTHERN_INDIAN_OCEAN,
  { id: "west_asia", refLon: 75, frame: [30, 0, 125, 55] },
  { id: "east_asia", refLon: 120, frame: [90, -5, 160, 60] },
  { id: "oceania", refLon: 160, frame: [105, -55, 200, 20] },
];

export type RenderResult = {
  svg: string;
  meta: RenderMeta;
};

type RenderOptions = {
  paddingPct?: number;
  minExtentDeg?: number;
  theme?: "transparent" | "blue";
  marginPx?: number;
  mode?: "zoom" | "atlas";
};

function geometryToMultiPolygonCoordinates(
  geometry: GeoJSON.Geometry,
): number[][][][] {
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  if (geometry.type === "GeometryCollection") {
    const out: number[][][][] = [];
    for (const g of geometry.geometries)
      out.push(...geometryToMultiPolygonCoordinates(g));
    return out;
  }
  return [];
}

function mergeCountryGroup(group: CountryFeature[]): CountryFeature {
  if (group.length === 1) return group[0];
  const base = group[0];
  const coordinates: number[][][][] = [];
  for (const c of group) {
    coordinates.push(...geometryToMultiPolygonCoordinates(c.feature.geometry));
  }

  const mergedGeometry: GeoJSON.MultiPolygon = {
    type: "MultiPolygon",
    coordinates,
  };
  const mergedFeature: GeoJSON.Feature<
    GeoJSON.MultiPolygon,
    Record<string, unknown>
  > = {
    type: "Feature",
    properties: { ...(base.feature.properties ?? {}) },
    geometry: mergedGeometry,
  };

  const centroid = geoCentroid(mergedFeature as unknown as GeoJSON.GeoJSON) as [
    number,
    number,
  ];
  const bbox_raw = computeBboxRaw(mergedGeometry);
  const ref = centroid[0];
  const bbox_unwrapped = computeBboxUnwrapped(mergedGeometry, ref);

  return {
    ...base,
    feature: mergedFeature,
    centroid,
    bbox_raw,
    bbox_unwrapped_ref: ref,
    bbox_unwrapped,
  };
}

function aggregateCountriesByIso2(
  countries: CountryFeature[],
): CountryFeature[] {
  const byIso2 = new Map<string, CountryFeature[]>();
  for (const c of countries) {
    const list = byIso2.get(c.iso2);
    if (list) list.push(c);
    else byIso2.set(c.iso2, [c]);
  }

  return [...byIso2.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, group]) => mergeCountryGroup(group));
}

function findTarget(
  countries: CountryFeature[],
  targetIso2: string,
): CountryFeature {
  const target = countries.find((c) => c.iso2 === targetIso2);
  if (!target) throw new Error(`Target not found: ${targetIso2}`);
  return target;
}

function selectRegionForTarget(target: CountryFeature): AtlasRegion {
  if (PACIFIC_ISLAND_ISO2.has(target.iso2)) return PACIFIC_ISLANDS_GLOBAL;
  if (SOUTHERN_ISLAND_ISO2.has(target.iso2)) return SOUTHERN_INDIAN_OCEAN;
  if (INDIAN_OCEAN_ISLAND_ISO2.has(target.iso2)) return NORTH_INDIAN_OCEAN;
  if (SOUTHEAST_ASIA_ISO2.has(target.iso2)) return SOUTHEAST_ASIA;
  if (target.iso2 === "NZ") return NEW_ZEALAND_CONTEXT;
  if (CARIBBEAN_ISLAND_ISO2.has(target.iso2))
    return ATLAS_REGIONS.find((r) => r.id === "caribbean")!;
  if (NORTH_AMERICA_ISLAND_ISO2.has(target.iso2))
    return ATLAS_REGIONS.find((r) => r.id === "north_america")!;

  // Kazakhstan's centroid falls in europe_east but the country extends to ~87°E — assign to west_asia.
  if (target.iso2 === "KZ")
    return ATLAS_REGIONS.find((r) => r.id === "west_asia")!;

  const [lon, lat] = target.centroid;
  for (const region of ATLAS_REGIONS) {
    const lonU = unwrapLon(lon, region.refLon);
    const [minX, minY, maxX, maxY] = region.frame;
    if (lonU >= minX && lonU <= maxX && lat >= minY && lat <= maxY)
      return region;
  }

  // Fallback: nearest region center.
  let best = ATLAS_REGIONS[0];
  let bestDist = Infinity;
  for (const region of ATLAS_REGIONS) {
    const [minX, minY, maxX, maxY] = region.frame;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const lonU = unwrapLon(lon, region.refLon);
    const dx = lonU - cx;
    const dy = lat - cy;
    const dist2 = dx * dx + dy * dy;
    if (dist2 < bestDist) {
      bestDist = dist2;
      best = region;
    }
  }
  return best;
}

// Returns true for island nations that should use per-island rings instead of a single extent ellipse.
function isIslandNation(iso2: string): boolean {
  return (
    PACIFIC_ISLAND_ISO2.has(iso2) ||
    SOUTHERN_ISLAND_ISO2.has(iso2) ||
    AFRICA_ISLAND_ISO2.has(iso2) ||
    INDIAN_OCEAN_ISLAND_ISO2.has(iso2) ||
    CARIBBEAN_ISLAND_ISO2.has(iso2) ||
    NORTH_AMERICA_ISLAND_ISO2.has(iso2)
  );
}

// Dashed ellipse drawn around the full bounding box of an archipelago.
// Only used for non-island-nation scattered countries in zoom mode.
function archipelagoExtentSvg(
  targetBounds: [[number, number], [number, number]],
  targetProjectedArea: number,
): string {
  const [[x0, y0], [x1, y1]] = targetBounds;
  const w = Math.max(0, x1 - x0);
  const h = Math.max(0, y1 - y0);
  const boundsArea = w * h;
  if (boundsArea === 0) return "";

  const fillRatio = targetProjectedArea / boundsArea;
  if (boundsArea < 8000 || fillRatio >= 0.1) return "";

  const cx = ((x0 + x1) / 2).toFixed(1);
  const cy = ((y0 + y1) / 2).toFixed(1);
  const pad = Math.min(Math.max(w, h) * 0.1, 55);
  const rx = (w / 2 + pad).toFixed(1);
  const ry = (h / 2 + pad).toFixed(1);
  const span = Math.max(w, h);
  const dash = Math.max(12, span * 0.07).toFixed(0);
  const gap = Math.max(7, span * 0.04).toFixed(0);

  return [
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#F97316" opacity="0.07"/>`,
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#F97316" stroke-width="2.5" stroke-dasharray="${dash} ${gap}" opacity="0.55"/>`,
  ].join("");
}

// Draws individual orange highlight rings around each visible polygon of an island nation.
// Drawn ON TOP of fills so each island/atoll is clearly circled, matching the reference style.
// Each polygon (island/atoll) gets its own tight ellipse ring. Sub-pixel islands still get a
// minimum-radius ring so they are visible in the atlas view.
function perIslandRingsSvg(
  targetFeature: GeoJSON.Feature,
  pathFn: ReturnType<typeof geoPath>,
): string {
  const polygons = geometryToMultiPolygonCoordinates(targetFeature.geometry);
  if (polygons.length === 0) return "";

  const MIN_RING_R = 13; // minimum ellipse radius px (makes sub-pixel islands visible)
  const ISLAND_PAD = 9; // padding around clearly visible island bounds
  const SKIP_LARGE_AREA = 4000; // skip ring for large, clearly-visible islands
  const MAX_RINGS = 80; // safety cap for countries with hundreds of tiny islets
  // Minimum distance between ring centers to avoid overlapping duplicates.
  const DEDUP_DIST = MIN_RING_R * 1.5;

  const rings: string[] = [];
  const centers: [number, number][] = []; // for dedup

  for (const polyCoords of polygons) {
    if (rings.length >= MAX_RINGS) break;

    const polyFeature = {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "Polygon" as const, coordinates: polyCoords },
    };
    const geoObj = polyFeature as unknown as GeoJSON.GeoJSON;

    const [[x0, y0], [x1, y1]] = pathFn.bounds(geoObj);

    // Skip polygons entirely outside the viewport (50px tolerance)
    if (x1 < -50 || y1 < -50 || x0 > SIZE + 50 || y0 > SIZE + 50) continue;

    const w = Math.max(0, x1 - x0);
    const h = Math.max(0, y1 - y0);
    const area = pathFn.area(geoObj);

    // Skip truly degenerate polygons with no projected extent and no area
    if (w < 0.1 && h < 0.1 && area < 0.01) continue;

    // Skip large clearly-visible islands that don't need a highlight ring
    if (area > SKIP_LARGE_AREA && w > 80 && h > 80) continue;

    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;

    // Skip if a ring with a very close center already exists (dedup nearby atolls)
    const tooClose = centers.some((c) => {
      const dx = cx - c[0];
      const dy = cy - c[1];
      return dx * dx + dy * dy < DEDUP_DIST * DEDUP_DIST;
    });
    if (tooClose) continue;
    centers.push([cx, cy]);

    const rx = Math.max(MIN_RING_R, w / 2 + ISLAND_PAD);
    const ry = Math.max(MIN_RING_R, h / 2 + ISLAND_PAD);

    const cxs = cx.toFixed(1);
    const cys = cy.toFixed(1);
    const rxs = rx.toFixed(1);
    const rys = ry.toFixed(1);
    // White halo underneath for contrast against any background color.
    rings.push(
      `<ellipse cx="${cxs}" cy="${cys}" rx="${rxs}" ry="${rys}" fill="none" stroke="white" stroke-width="5.5" opacity="0.6"/>`,
    );
    // Orange ring on top.
    rings.push(
      `<ellipse cx="${cxs}" cy="${cys}" rx="${rxs}" ry="${rys}" fill="#F97316" fill-opacity="0.08" stroke="#F97316" stroke-width="3.5" opacity="1"/>`,
    );
  }

  return rings.join("");
}

// Map pin (teardrop) with the tip pointing at (cx, cy), body extending upward.
// The arc formula: from left tangent point to right tangent point via the top of the
// head circle, using a large clockwise arc (sweep=1 in SVG y-down coordinates).
function mapPin(cx: number, cy: number, totalHeight: number): string {
  const R = totalHeight * 0.38; // head circle radius
  const hc = totalHeight * 0.6; // distance from tip to head center
  const alpha = Math.asin(Math.min(R / hc, 0.9999));
  const tx = R * Math.cos(alpha); // tangent point x offset
  const tyAbs = hc - R * Math.sin(alpha); // tangent point distance above tip
  const headCY = cy - hc;
  const innerR = R * 0.42;
  const f = (n: number) => n.toFixed(2);
  const lx = f(cx - tx);
  const rx = f(cx + tx);
  const ty = f(cy - tyAbs);
  return [
    // Drop shadow
    `<ellipse cx="${f(cx + 1.5)}" cy="${f(cy + 4)}" rx="${f(totalHeight * 0.22)}" ry="${f(totalHeight * 0.09)}" fill="black" opacity="0.18"/>`,
    // Pin body: tip → left tangent → large CW arc to right tangent → close
    `<path d="M ${f(cx)},${f(cy)} L ${lx},${ty} A ${f(R)},${f(R)} 0 1 1 ${rx},${ty} Z" fill="#EF4444"/>`,
    // Pin border
    `<path d="M ${f(cx)},${f(cy)} L ${lx},${ty} A ${f(R)},${f(R)} 0 1 1 ${rx},${ty} Z" fill="none" stroke="#991B1B" stroke-width="2.2" stroke-linejoin="round"/>`,
    // Inner white hole
    `<circle cx="${f(cx)}" cy="${f(headCY)}" r="${f(innerR)}" fill="white" opacity="0.88"/>`,
  ].join("");
}

function targetMarkerSvg(
  targetBounds: [[number, number], [number, number]],
  targetCenter?: [number, number] | null,
  targetProjectedArea?: number,
): string {
  const [[x0, y0], [x1, y1]] = targetBounds;
  const w = Math.max(0, x1 - x0);
  const h = Math.max(0, y1 - y0);
  const minDim = Math.min(w, h);
  const maxDim = Math.max(w, h);
  const boundsArea = w * h;
  const projectedArea = Math.max(0, targetProjectedArea ?? 0);
  const fillRatio = boundsArea > 0 ? projectedArea / boundsArea : 0;

  // Handle far-apart tiny islands (large bbox, tiny actual filled area).
  const shouldMark =
    maxDim <= 34 ||
    minDim <= 14 ||
    boundsArea <= 1600 ||
    projectedArea <= 2200 ||
    (projectedArea <= 6000 && fillRatio <= 0.08);
  if (!shouldMark) return "";

  const cx = targetCenter?.[0] ?? (x0 + x1) / 2;
  const cy = targetCenter?.[1] ?? (y0 + y1) / 2;
  // Larger pins for very small islands so the marker is clearly readable.
  const H = projectedArea <= 300 ? 80 : projectedArea <= 1200 ? 70 : 58;
  return mapPin(cx, cy, H);
}

function explicitArchipelagoMarkersSvg(
  iso2: string,
  project: (lonLat: [number, number]) => [number, number] | null,
): string {
  if (iso2 !== "KI") return "";

  // Kiribati spans three distant island groups; mark each to make the target explicit.
  const groups: [number, number][] = [
    [173.0, 1.5], // Gilbert Islands
    [-171.5, -4.5], // Phoenix Islands
    [-157.5, 1.5], // Line Islands
  ];

  const pins: string[] = [];
  for (const p of groups) {
    const lonNearPacificRef = unwrapLon(p[0], 170);
    const xy = project([lonNearPacificRef, p[1]]);
    if (!xy) continue;
    const [cx, cy] = xy;
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
    if (cx < -200 || cy < -200 || cx > SIZE + 200 || cy > SIZE + 200) continue;
    pins.push(mapPin(cx, cy, 60));
  }

  return pins.join("");
}

function renderAtlas(
  countries: CountryFeature[],
  targetIso2: string,
  theme: "transparent" | "blue",
  marginPx: number,
): RenderResult {
  const target = findTarget(countries, targetIso2);
  const region = selectRegionForTarget(target);

  const projection = geoNaturalEarth1()
    .rotate([-region.refLon, 0])
    .precision(0.02)
    .fitExtent(
      [
        [marginPx, marginPx],
        [SIZE - marginPx, SIZE - marginPx],
      ],
      bboxToMultiPoint(region.frame) as unknown as GeoJSON.GeoJSON,
    )
    // Hard clip to viewport to avoid long offscreen segments and fill artifacts near antimeridian.
    .clipExtent([
      [0, 0],
      [SIZE, SIZE],
    ]);

  const path = geoPath(projection);

  // Early fallback: if the country is essentially invisible at atlas scale (< 8 projected px²),
  // render a local zoom that shows the immediate geographic context instead of the whole continent.
  // This covers micro-states (Monaco, Vatican, San Marino…) and tiny island nations.
  // Exceptions:
  //   - Caribbean/Antilles islands stay in the Caribbean atlas frame with forceZone ellipse.
  //   - Southern territories (TF, HM) stay in SOUTHERN_INDIAN_OCEAN with archipelago ellipse + markers.
  //   - Pacific island nations stay in PACIFIC_ISLANDS_GLOBAL; forceZone ensures a visible ellipse.
  //   - Bermuda (BM) stays in the North America atlas frame.
  const targetProjectedArea = path.area(
    target.feature as unknown as GeoJSON.GeoJSON,
  );
  const isPacificIsland = PACIFIC_ISLAND_ISO2.has(target.iso2);
  const isAfricaIsland = AFRICA_ISLAND_ISO2.has(target.iso2);
  const isNorthAmericaIsland = NORTH_AMERICA_ISLAND_ISO2.has(target.iso2);
  const isIndianOceanIsland = INDIAN_OCEAN_ISLAND_ISO2.has(target.iso2);
  if (
    targetProjectedArea < 8 &&
    region.id !== "caribbean" &&
    !SOUTHERN_ISLAND_ISO2.has(target.iso2) &&
    !isPacificIsland &&
    !isAfricaIsland &&
    !isNorthAmericaIsland &&
    !isIndianOceanIsland
  ) {
    // Wider context for remote ocean islands so surrounding geography is visible.
    return renderZoom(countries, target.iso2, 0.3, 12, theme, marginPx);
  }

  const targetDCheck = path(target.feature as unknown as GeoJSON.GeoJSON);
  if (!targetDCheck) {
    // Fallback for remote territories that may not fit any fixed atlas frame.
    return renderZoom(countries, targetIso2, 0.4, 2, theme, marginPx);
  }
  const visible: CountryFeature[] = [];
  for (const c of countries) {
    const d = path(c.feature as unknown as GeoJSON.GeoJSON);
    if (!d) continue;
    const [[x0, y0], [x1, y1]] = path.bounds(
      c.feature as unknown as GeoJSON.GeoJSON,
    );
    if (x1 < 0 || y1 < 0 || x0 > SIZE || y0 > SIZE) continue;
    visible.push(c);
  }
  const others = visible
    .filter((c) => c.iso2 !== targetIso2)
    .sort((a, b) => a.iso2.localeCompare(b.iso2));

  // Island nations get per-island rings drawn after fills; others get the old extent ellipse before fills.
  const usePerIslandRings =
    !NO_EXTENT_ELLIPSE_ISO2.has(target.iso2) && isIslandNation(target.iso2);
  const targetBoundsEarly = path.bounds(
    target.feature as unknown as GeoJSON.GeoJSON,
  );
  const extentEllipse =
    !usePerIslandRings && !NO_EXTENT_ELLIPSE_ISO2.has(target.iso2)
      ? archipelagoExtentSvg(targetBoundsEarly, targetProjectedArea)
      : "";

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="geometricPrecision">`,
  );

  if (theme === "blue") {
    parts.push(
      `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${COLORS.water}"/>`,
    );
  }

  if (extentEllipse) parts.push(extentEllipse);

  parts.push(`<g fill="${COLORS.otherFill}" stroke="none">`);
  for (const c of others) {
    const d = path(c.feature as unknown as GeoJSON.GeoJSON);
    if (!d) continue;
    parts.push(`<path id="country-${c.iso2}" d="${d}"/>`);
  }
  parts.push(`</g>`);

  const targetD = targetDCheck;
  parts.push(
    `<path id="country-${target.iso2}" class="target" d="${targetD}" fill="${COLORS.targetFill}" stroke="none"/>`,
  );

  parts.push(
    `<g fill="none" stroke="${COLORS.stroke}" stroke-width="${STROKE.all}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke">`,
  );
  for (const c of others) {
    const d = path(c.feature as unknown as GeoJSON.GeoJSON);
    if (!d) continue;
    parts.push(`<path d="${d}"/>`);
  }
  parts.push(`<path d="${targetD}"/>`);
  parts.push(`</g>`);

  parts.push(
    `<path d="${targetD}" fill="none" stroke="${COLORS.stroke}" stroke-width="${STROKE.target}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`,
  );

  // Per-island rings: drawn on top of fills for island nations (each island/atoll gets its own ring).
  if (usePerIslandRings) {
    const islandRings = perIslandRingsSvg(
      target.feature as unknown as GeoJSON.Feature,
      path,
    );
    if (islandRings) parts.push(islandRings);
  }

  const targetBounds = targetBoundsEarly;
  const centerByPath = path.centroid(
    target.feature as unknown as GeoJSON.GeoJSON,
  );
  const fallbackCenter = projection(target.centroid as [number, number]);
  const targetCenter =
    Number.isFinite(centerByPath[0]) && Number.isFinite(centerByPath[1])
      ? centerByPath
      : fallbackCenter;
  // For island nations: per-island rings replace the pin. For others: keep pin logic.
  if (!usePerIslandRings && !extentEllipse) {
    const marker = targetMarkerSvg(
      targetBounds,
      targetCenter as [number, number] | null,
      targetProjectedArea,
    );
    if (marker) parts.push(marker);
  }
  // Kiribati gets explicit group markers replaced by per-island rings now.
  if (!usePerIslandRings) {
    const explicitMarkers = explicitArchipelagoMarkersSvg(
      target.iso2,
      (lonLat) => projection(lonLat),
    );
    if (explicitMarkers) parts.push(explicitMarkers);
  }

  parts.push(`</svg>`);

  const targetBboxInRegionRef = computeBboxUnwrapped(
    target.feature.geometry,
    region.refLon,
  );

  return {
    svg: parts.join(""),
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
        min_extent_deg: 0,
      },
      projected: {
        viewBox: [0, 0, SIZE, SIZE],
        target_bounds: targetBounds,
      },
    },
  };
}

function renderZoom(
  countries: CountryFeature[],
  targetIso2: string,
  paddingPct: number,
  minExtentDeg: number,
  theme: "transparent" | "blue",
  marginPx: number,
): RenderResult {
  const target = findTarget(countries, targetIso2);

  const refLon = target.centroid[0];
  const padded = bboxPadAndMinExtent(
    // Recompute bbox in the same unwrapped space we will use for intersection tests.
    computeBboxUnwrapped(target.feature.geometry, refLon),
    paddingPct,
    minExtentDeg,
  );

  const visible: CountryFeature[] = [];
  for (const c of countries) {
    const bb = computeBboxUnwrapped(c.feature.geometry, refLon);
    if (bboxIntersects(bb, padded)) visible.push(c);
  }

  // Stable rendering order: non-target first (iso2), target last.
  const others = visible
    .filter((c) => c.iso2 !== targetIso2)
    .sort((a, b) => a.iso2.localeCompare(b.iso2));

  const projection = geoNaturalEarth1()
    .rotate([-refLon, 0])
    // Smaller => more resampling => smoother/more detailed borders.
    .precision(0.02)
    .fitExtent(
      [
        [marginPx, marginPx],
        [SIZE - marginPx, SIZE - marginPx],
      ],
      bboxToMultiPoint(padded) as unknown as GeoJSON.GeoJSON,
    )
    .clipExtent([
      [0, 0],
      [SIZE, SIZE],
    ]);

  const path = geoPath(projection);

  const targetBoundsEarlyZ = path.bounds(
    target.feature as unknown as GeoJSON.GeoJSON,
  );
  const targetProjectedAreaZ = path.area(
    target.feature as unknown as GeoJSON.GeoJSON,
  );
  const usePerIslandRingsZ =
    !NO_EXTENT_ELLIPSE_ISO2.has(target.iso2) && isIslandNation(targetIso2);
  const extentEllipseZ =
    !usePerIslandRingsZ && !NO_EXTENT_ELLIPSE_ISO2.has(target.iso2)
      ? archipelagoExtentSvg(targetBoundsEarlyZ, targetProjectedAreaZ)
      : "";

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="geometricPrecision">`,
  );

  if (theme === "blue") {
    parts.push(
      `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${COLORS.water}"/>`,
    );
  }

  if (extentEllipseZ) parts.push(extentEllipseZ);

  // Fill layer (no stroke): keeps colors clean.
  parts.push(`<g fill="${COLORS.otherFill}" stroke="none">`);
  for (const c of others) {
    const d = path(c.feature as unknown as GeoJSON.GeoJSON);
    if (!d) continue;
    parts.push(`<path id="country-${c.iso2}" d="${d}"/>`);
  }
  parts.push(`</g>`);

  const targetD = path(target.feature as unknown as GeoJSON.GeoJSON);
  if (!targetD) throw new Error(`Target path is empty for ${targetIso2}`);

  parts.push(
    `<path id="country-${target.iso2}" class="target" d="${targetD}" fill="${COLORS.targetFill}" stroke="none"/>`,
  );

  // Borders layer: draw borders for all visible countries (including the target) on top.
  parts.push(
    `<g fill="none" stroke="${COLORS.stroke}" stroke-width="${STROKE.all}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke">`,
  );
  for (const c of others) {
    const d = path(c.feature as unknown as GeoJSON.GeoJSON);
    if (!d) continue;
    parts.push(`<path d="${d}"/>`);
  }
  parts.push(`<path d="${targetD}"/>`);
  parts.push(`</g>`);

  // Target emphasis: slightly thicker border for the target only.
  parts.push(
    `<path d="${targetD}" fill="none" stroke="${COLORS.stroke}" stroke-width="${STROKE.target}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`,
  );

  // Per-island rings for island nations (drawn on top of fills).
  if (usePerIslandRingsZ) {
    const islandRings = perIslandRingsSvg(
      target.feature as unknown as GeoJSON.Feature,
      path,
    );
    if (islandRings) parts.push(islandRings);
  }

  const targetBounds = targetBoundsEarlyZ;
  const targetProjectedArea = targetProjectedAreaZ;
  const centerByPath = path.centroid(
    target.feature as unknown as GeoJSON.GeoJSON,
  );
  const fallbackCenter = projection(target.centroid as [number, number]);
  const targetCenter =
    Number.isFinite(centerByPath[0]) && Number.isFinite(centerByPath[1])
      ? centerByPath
      : fallbackCenter;
  if (!usePerIslandRingsZ && !extentEllipseZ) {
    const marker = targetMarkerSvg(
      targetBounds,
      targetCenter as [number, number] | null,
      targetProjectedArea,
    );
    if (marker) parts.push(marker);
  }

  parts.push(`</svg>`);

  return {
    svg: parts.join(""),
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
        min_extent_deg: minExtentDeg,
      },
      projected: {
        viewBox: [0, 0, SIZE, SIZE],
        target_bounds: targetBounds,
      },
    },
  };
}

export function renderCountrySvg(
  countries: CountryFeature[],
  targetIso2: string,
  opts?: RenderOptions,
): RenderResult {
  const mergedCountries = aggregateCountriesByIso2(countries);
  const mode = opts?.mode ?? "atlas";
  const paddingPct = opts?.paddingPct ?? 0.25;
  const minExtentDeg = opts?.minExtentDeg ?? 2;
  const theme = opts?.theme ?? "transparent";
  const marginPx = opts?.marginPx ?? MARGIN;

  if (mode === "zoom")
    return renderZoom(
      mergedCountries,
      targetIso2,
      paddingPct,
      minExtentDeg,
      theme,
      marginPx,
    );
  return renderAtlas(mergedCountries, targetIso2, theme, marginPx);
}
