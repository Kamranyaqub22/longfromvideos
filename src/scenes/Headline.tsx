import type { SceneOf } from "../schema";
import { useEnter, useProgress } from "../components/anim";
import { C, body } from "../theme";

export const Headline: React.FC<{ scene: SceneOf<"headline"> }> = ({ scene }) => {
  const { source, date, headline, dek } = scene.props;
  const e = useEnter(4);
  const underline = useProgress(18, 45);
  return (
    <div
      style={{
        background: "#f7f5ef",
        color: "#111",
        borderRadius: 14,
        padding: "56px 70px",
        boxShadow: "0 40px 90px rgba(0,0,0,0.5)",
        transform: `rotate(${(1 - e) * -3}deg) scale(${0.92 + e * 0.08})`,
        fontFamily: body,
        maxWidth: 1500,
        alignSelf: "center",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: 2 }}>
        <span>{source}</span>
        <span>{date}</span>
      </div>
      <div style={{ height: 2, background: "#ccc", margin: "22px 0 30px" }} />
      <div style={{ fontSize: headline.length > 80 ? 58 : 70, fontWeight: 800, lineHeight: 1.12 }}>
        <span
          style={{
            backgroundImage: `linear-gradient(${C.accent}, ${C.accent})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${underline * 100}% 30%`,
            backgroundPosition: "0 88%",
          }}
        >
          {headline}
        </span>
      </div>
      {dek ? <div style={{ fontSize: 32, color: "#444", marginTop: 26, lineHeight: 1.3 }}>{dek}</div> : null}
    </div>
  );
};
