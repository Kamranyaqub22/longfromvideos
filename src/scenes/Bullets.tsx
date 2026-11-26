import type { SceneOf } from "../schema";
import { useSceneDuration } from "../components/SceneContext";
import { staggerFrame, useEnter } from "../components/anim";
import { C, body, display } from "../theme";
import { Title } from "./common";

const Item: React.FC<{ n: number; text: string; delay: number }> = ({ n, text, delay }) => {
  const e = useEnter(delay);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 34, opacity: e, transform: `translateX(${(1 - e) * -60}px)`, marginBottom: 30 }}>
      <div style={{ fontFamily: display, fontSize: 64, color: C.bg, background: C.accent, width: 92, height: 92, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {n}
      </div>
      <div style={{ fontFamily: body, fontWeight: 800, fontSize: 52, color: C.text }}>{text}</div>
    </div>
  );
};

export const Bullets: React.FC<{ scene: SceneOf<"bullets"> }> = ({ scene }) => {
  const durationInFrames = useSceneDuration();
  const { title, items } = scene.props;
  return (
    <>
      <Title>{title}</Title>
      {items.map((t, i) => (
        <Item key={i} n={i + 1} text={t} delay={staggerFrame(i, items.length, durationInFrames)} />
      ))}
    </>
  );
};
