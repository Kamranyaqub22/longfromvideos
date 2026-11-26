import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../theme";

/** Dark gradient with a slowly drifting grid: never a fully static frame. */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = (frame * 0.25) % 80;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 20%, ${C.bg2} 0%, ${C.bg} 70%)` }}>
      <AbsoluteFill
        style={{
          opacity: 0.35,
          backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          backgroundPosition: `${drift}px ${drift}px`,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
    </AbsoluteFill>
  );
};
