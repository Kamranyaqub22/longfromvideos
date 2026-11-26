/**
 * Country geometry from Natural Earth (public domain) via world-atlas, 1:50m.
 * Shared by the map scene (rendering) and the linter (name validation).
 */
import { geoArea, geoCentroid } from "d3-geo";
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-50m.json";

type Props = { name: string };
export type Country = Feature<Polygon | MultiPolygon, Props>;

let cache: Country[] | null = null;
export function countries(): Country[] {
  if (!cache) {
    const topo = world as unknown as Topology<{ countries: GeometryCollection<Props> }>;
    cache = (feature(topo, topo.objects.countries) as FeatureCollection<Geometry, Props>).features.filter(
      (f): f is Country => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon",
    );
  }
  return cache;
}

/** Everyday names → Natural Earth names. Keys are lower-case. */
const ALIASES: Record<string, string> = {
  usa: "United States of America",
  us: "United States of America",
  "u.s.": "United States of America",
  "united states": "United States of America",
  america: "United States of America",
  uk: "United Kingdom",
  "u.k.": "United Kingdom",
  britain: "United Kingdom",
  "great britain": "United Kingdom",
  england: "United Kingdom",
  uae: "United Arab Emirates",
  korea: "South Korea",
  "republic of korea": "South Korea",
  holland: "Netherlands",
  "the netherlands": "Netherlands",
  "czech republic": "Czechia",
  drc: "Dem. Rep. Congo",
  "democratic republic of the congo": "Dem. Rep. Congo",
  "ivory coast": "Côte d'Ivoire",
  turkiye: "Turkey",
  "türkiye": "Turkey",
  burma: "Myanmar",
};

/** Canonical Natural Earth name for a country, or null if unknown. */
export function resolveCountry(name: string): string | null {
  const n = name.trim().toLowerCase();
  const alias = ALIASES[n];
  if (alias) return alias;
  return countries().find((c) => c.properties.name.toLowerCase() === n)?.properties.name ?? null;
}

/** Up to 3 close matches, for helpful error messages. */
export function suggestCountries(name: string): string[] {
  const n = name.trim().toLowerCase();
  return countries()
    .map((c) => c.properties.name)
    .filter((c) => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()) || c.toLowerCase().slice(0, 4) === n.slice(0, 4))
    .slice(0, 3);
}

export function getCountry(name: string): Country {
  const canon = resolveCountry(name);
  const c = canon && countries().find((x) => x.properties.name === canon);
  if (!c) throw new Error(`Unknown country "${name}"`);
  return c;
}

/**
 * Where to put a label / route end: centroid of the country's largest polygon,
 * so overseas territories (e.g. French Guiana, Alaska) don't drag it into the ocean.
 */
export function anchor(c: Country): [number, number] {
  return geoCentroid(mainland(c));
}

/** The country's largest polygon: used for framing, so e.g. France doesn't pull in French Guiana. */
export function mainland(c: Country): Feature<Polygon, Props> {
  if (c.geometry.type === "Polygon") return c as Feature<Polygon, Props>;
  const polys = c.geometry.coordinates.map((coordinates) => ({ type: "Polygon" as const, coordinates }));
  const largest = polys.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
  return { type: "Feature", properties: c.properties, geometry: largest };
}

/** Circular mean of longitudes, so the map is centred on the story (e.g. the Pacific for US–Asia). */
export function centreLongitude(points: [number, number][]): number {
  if (!points.length) return 0;
  const r = Math.PI / 180;
  const x = points.reduce((s, p) => s + Math.cos(p[0] * r), 0);
  const y = points.reduce((s, p) => s + Math.sin(p[0] * r), 0);
  return Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9 ? 0 : Math.atan2(y, x) / r;
}
