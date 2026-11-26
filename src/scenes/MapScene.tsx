import { useMemo } from "react";
import { geoGraticule10, geoInterpolate, geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, MultiPoint } from "geojson";
import { interpolate, useCurrentFrame } from "remotion";
import type { SceneOf } from "../schema";
import { useSceneDuration } from "../components/SceneContext";
import { staggerFrame } from "../components/anim";
import { anchor, centreLongitude, countries, getCountry, mainland } from "../lib/geo";
import { C, body, toneColor } from "../theme";
import { SourceNote, Title } from "./common";

const W = 1640;

/** Smallest view: ~25° across, so tiny countries (Singapore) still show their surroundings. */
const MAX_SCALE_PER_WIDTH = 2.2;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const MapScene: React.FC<{ scene: SceneOf<"map"> }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const duration = useSceneDuration();
  const { title, view, highlights, routes, source } = scene.props;
  const H = title ? 600 : 720;

  const geo = useMemo(() => {
    const hl = highlights.map((h) => ({ ...h, c: getCountry(h.country) }));
    const rt = routes.map((r) => ({ ...r, a: anchor(getCountry(r.from)), b: anchor(getCountry(r.to)) }));

    const keyPoints = [...hl.map((h) => anchor(h.c)), ...rt.flatMap((r) => [r.a, r.b, geoInterpolate(r.a, r.b)(0.5)])];
    const projection = geoNaturalEarth1().rotate([-centreLongitude(keyPoints), 0]);
    if (view === "world") {
      projection.fitExtent([[10, 10], [W - 10, H - 10]], { type: "Sphere" });
    } else {
      const ends: Feature<MultiPoint> = { type: "Feature", properties: {}, geometry: { type: "MultiPoint", coordinates: rt.flatMap((r) => [r.a, r.b]) } };
      projection.fitExtent([[90, 70], [W - 90, H - 50]], { type: "FeatureCollection", features: [...hl.map((h) => mainland(h.c)), ...(rt.length ? [ends] : [])] });
      const maxScale = MAX_SCALE_PER_WIDTH * W;
      if (projection.scale() > maxScale) {
        // Zoom out around the same centre.
        const centre = projection.invert!([W / 2, H / 2])!;
        projection.scale(maxScale);
        const [x, y] = projection(centre)!;
        const [tx, ty] = projection.translate();
        projection.translate([tx + W / 2 - x, ty + H / 2 - y]);
      }
    }
    const path = geoPath(projection);

    const base = countries().map((c) => path(c) ?? "");
    const graticule = path(geoGraticule10()) ?? "";
    const sphere = path({ type: "Sphere" }) ?? "";
    const hlPaths = hl.map((h) => {
      const [[x0, y0], [x1, y1]] = path.bounds(h.c);
      // Too small to see when filled (Singapore, Taiwan at world scale): add a marker ring.
      const tiny = x1 - x0 < 16 && y1 - y0 < 16;
      const at = projection(anchor(h.c));
      // Label sits just above the country (or its marker) instead of covering it.
      const top = tiny && at ? at[1] - 22 : path.bounds(mainland(h.c))[0][1];
      const labelAt: [number, number] | null = at ? [at[0], Math.max(34, top - 34)] : null;
      return { d: path(h.c) ?? "", tone: h.tone, label: h.label, at, labelAt, tiny };
    });

    // Great-circle arcs, sampled; split where the projection wraps around the map edge.
    const rtPaths = rt.map((r) => {
      const ip = geoInterpolate(r.a, r.b);
      const pts = Array.from({ length: 81 }, (_, i) => projection(ip(i / 80))).filter((p): p is [number, number] => !!p);
      const segs: [number, number][][] = [[]];
      pts.forEach((p, i) => {
        if (i && Math.abs(p[0] - pts[i - 1][0]) > W / 2) segs.push([]);
        segs[segs.length - 1].push(p);
      });
      return { ...r, pts, segs };
    });
    // Route labels: try points along the arc, take the first that doesn't hit another label.
    const placed = hlPaths.filter((h) => h.label && h.labelAt).map((h) => box(h.labelAt![0], h.labelAt![1], h.label!));
    const rtLabels = rtPaths.map((r) => {
      if (!r.label) return null;
      for (const f of [0.5, 0.35, 0.65, 0.2, 0.8]) {
        const p = r.pts[Math.round(f * (r.pts.length - 1))];
        const b = box(p[0], p[1] - 40, r.label);
        if (!placed.some((o) => overlaps(o, b))) { placed.push(b); return [p[0], p[1] - 40] as [number, number]; }
      }
      const p = r.pts[Math.round(0.5 * (r.pts.length - 1))];
      return [p[0], p[1] - 40] as [number, number];
    });
    return { base, graticule, sphere, hlPaths, rtPaths, rtLabels };
  }, [highlights, routes, view, H]);

  const n = geo.hlPaths.length + geo.rtPaths.length;
  const mapIn = interpolate(frame, [0, 15], [0, 1], clamp);

  return (
    <>
      {title ? <Title>{title}</Title> : null}
      <svg width={W} height={H} style={{ overflow: "hidden", borderRadius: 18, opacity: mapIn }}>
        <path d={geo.sphere} fill="#0f1830" />
        <path d={geo.graticule} fill="none" stroke={C.line} strokeWidth={0.6} opacity={0.5} />
        {geo.base.map((d, i) => (
          <path key={i} d={d} fill="#1e2840" stroke="#33405e" strokeWidth={0.7} />
        ))}
        {geo.hlPaths.map((h, i) => {
          const t = interpolate(frame, [staggerFrame(i, n, duration, 0.6, 10), staggerFrame(i, n, duration, 0.6, 10) + 15], [0, 1], clamp);
          const pulse = 1 + 0.25 * Math.sin((frame / 30) * Math.PI * 2);
          return (
            <g key={i}>
              <path d={h.d} fill={toneColor(h.tone)} fillOpacity={0.85 * t} stroke={toneColor(h.tone)} strokeWidth={1.5} strokeOpacity={t} />
              {h.tiny && h.at ? (
                <circle cx={h.at[0]} cy={h.at[1]} r={16 * pulse * t} fill={toneColor(h.tone)} fillOpacity={0.35} stroke={toneColor(h.tone)} strokeWidth={4} opacity={t} />
              ) : null}
            </g>
          );
        })}
        {geo.rtPaths.map((r, i) => {
          const start = staggerFrame(geo.hlPaths.length + i, n, duration, 0.6, 10);
          const t = interpolate(frame, [start, start + 40], [0, 1], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 });
          const upto = Math.max(1, Math.round(t * (r.pts.length - 1)));
          let left = upto;
          const color = toneColor(r.tone);
          const head = r.pts[upto];
          return (
            <g key={i}>
              {r.segs.map((seg, k) => {
                const take = seg.slice(0, Math.max(0, Math.min(seg.length, left + 1)));
                left -= seg.length;
                return take.length > 1 ? (
                  <polyline key={k} points={take.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
                ) : null;
              })}
              {t > 0 ? <circle cx={r.pts[0][0]} cy={r.pts[0][1]} r={9} fill={C.text} /> : null}
              {t > 0 ? <circle cx={head[0]} cy={head[1]} r={12} fill={color} stroke={C.bg} strokeWidth={3} /> : null}
              {r.label && geo.rtLabels[i] && t >= 1 ? <Label x={geo.rtLabels[i]![0]} y={geo.rtLabels[i]![1]} text={r.label} color={color} /> : null}
            </g>
          );
        })}
        {geo.hlPaths.map((h, i) => {
          const at = staggerFrame(i, n, duration, 0.6, 10) + 12;
          return h.label && h.labelAt && frame >= at ? <Label key={i} x={h.labelAt[0]} y={h.labelAt[1]} text={h.label} color={toneColor(h.tone)} /> : null;
        })}
      </svg>
      <SourceNote>{source ? `${source} · Map: Natural Earth` : "Map: Natural Earth"}</SourceNote>
    </>
  );
};

const labelWidth = (text: string) => text.length * 17 + 36;
type Box = { x0: number; y0: number; x1: number; y1: number };
const box = (x: number, y: number, text: string): Box => {
  const w = labelWidth(text);
  return { x0: x - w / 2 - 6, x1: x + w / 2 + 6, y0: y - 32, y1: y + 32 };
};
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

const Label: React.FC<{ x: number; y: number; text: string; color: string }> = ({ x, y, text, color }) => {
  const w = labelWidth(text);
  const cx = Math.min(Math.max(x, w / 2 + 8), W - w / 2 - 8);
  return (
    <g>
      <rect x={cx - w / 2} y={y - 26} width={w} height={52} rx={12} fill={C.bg} stroke={color} strokeWidth={3} />
      <text x={cx} y={y + 10} textAnchor="middle" fill={C.text} fontFamily={body} fontWeight={800} fontSize={30}>
        {text}
      </text>
    </g>
  );
};
