import { C, body, display } from "../theme";

export const Title: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 64 }) => (
  <div style={{ fontFamily: display, fontSize: size, color: C.text, textTransform: "uppercase", letterSpacing: 1, lineHeight: 1.05, marginBottom: 50 }}>
    {children}
  </div>
);

export const SourceNote: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
  children ? (
    <div style={{ position: "absolute", right: 140, bottom: 190, fontFamily: body, fontSize: 22, color: C.dim }}>Source: {children}</div>
  ) : null;
