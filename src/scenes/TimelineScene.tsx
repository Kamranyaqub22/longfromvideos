import type { SceneOf } from "../schema";
import { useSceneDuration } from "../components/SceneContext";
import { staggerFrame, useEnter, useProgress } from "../components/anim";
import { C, body } from "../theme";
import { Title } from "./common";

const Event: React.FC<{ date: string; text: string; delay: number; width: number }> = ({ date, text, delay, width }) => {
  const e = useEnter(delay);
  return (
    <div style={{ width, display: "flex", flexDirection: "column", alignItems: "center", opacity: e, transform: `translateY(${(1 - e) * 30}px)` }}>
      <div style={{ fontFamily: body, fontWeight: 800, fontSize: 34, color: C.accent, marginBottom: 24 }}>{date}</div>
      <div style={{ width: 30, height: 30, borderRadius: 15, background: C.accent, boxShadow: `0 0 0 8px rgba(255,204,51,0.2)` }} />
      <div style={{ fontFamily: body, fontWeight: 600, fontSize: 30, color: C.text, marginTop: 28, textAlign: "center", lineHeight: 1.25 }}>{text}</div>
    </div>
  );
};

export const TimelineScene: React.FC<{ scene: SceneOf<"timeline"> }> = ({ scene }) => {
  const durationInFrames = useSceneDuration();
  const { title, events } = scene.props;
  const line = useProgress(0, durationInFrames * 0.75);
  const w = 1640 / events.length;
  return (
    <>
      <Title>{title}</Title>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 82, left: w / 2, height: 4, width: (1640 - w) * line, background: C.line }} />
        <div style={{ display: "flex" }}>
          {events.map((ev, i) => (
            <Event key={i} {...ev} width={w} delay={staggerFrame(i, events.length, durationInFrames)} />
          ))}
        </div>
      </div>
    </>
  );
};
