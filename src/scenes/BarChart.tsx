import type { SceneOf } from "../schema";
import { useSceneDuration } from "../components/SceneContext";
import { staggerFrame, useProgress } from "../components/anim";
import { formatNumber } from "../lib/format";
import { C, body, toneColor } from "../theme";
import { SourceNote, Title } from "./common";

const Bar: React.FC<{ label: string; value: number; max: number; display: string; color: string; delay: number; count: number }> = (p) => {
  const g = useProgress(p.delay, p.delay + 30);
  const h = 470 * (p.value / p.max) * g;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", width: Math.min(230, 1400 / p.count) }}>
      <div style={{ fontFamily: body, fontWeight: 800, fontSize: 40, color: C.text, opacity: g, marginBottom: 12 }}>{p.display}</div>
      <div style={{ width: "72%", height: Math.max(h, 2), background: p.color, borderRadius: "10px 10px 0 0" }} />
      <div style={{ fontFamily: body, fontWeight: 600, fontSize: 28, color: C.dim, marginTop: 16, textAlign: "center", height: 70 }}>{p.label}</div>
    </div>
  );
};

export const BarChart: React.FC<{ scene: SceneOf<"barchart"> }> = ({ scene }) => {
  const durationInFrames = useSceneDuration();
  const { title, bars, source } = scene.props;
  const max = Math.max(...bars.map((b) => b.value)) || 1;
  return (
    <>
      <Title>{title}</Title>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 40, borderBottom: `2px solid ${C.line}` }}>
        {bars.map((b, i) => (
          <Bar
            key={i}
            label={b.label}
            value={b.value}
            max={max}
            count={bars.length}
            display={b.display ?? formatNumber(b.value)}
            color={toneColor(b.tone ?? (i === bars.length - 1 ? "accent" : "neutral"))}
            delay={staggerFrame(i, bars.length, durationInFrames, 0.5)}
          />
        ))}
      </div>
      <SourceNote>{source}</SourceNote>
    </>
  );
};
