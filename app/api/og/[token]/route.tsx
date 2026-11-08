import { ImageResponse } from "next/og";
import { getFestival } from "@/lib/festivals";
import { decodeWish } from "@/lib/token";

export const runtime = "edge";

/**
 * Share preview (WhatsApp / iMessage / X). Everything is drawn with shapes —
 * no emoji or remote assets — so it renders reliably anywhere.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = decodeWish(token);
  const f = getFestival(data?.f);
  const to = data?.t || "";
  const from = data?.s;

  const lamp = (x: number, y: number, s: number, o = 1) => (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", flexDirection: "column", alignItems: "center", opacity: o }}>
      {/* glow */}
      <div style={{ position: "absolute", top: -40 * s, width: 160 * s, height: 160 * s, borderRadius: 999, background: "radial-gradient(circle, rgba(255,170,60,0.55), rgba(255,140,40,0) 70%)" }} />
      {/* flame */}
      <div style={{ width: 22 * s, height: 46 * s, borderRadius: "50% 50% 50% 50% / 65% 65% 35% 35%", background: "linear-gradient(180deg, #fff7d6, #ffd166 45%, #ff8a1f)", marginBottom: 2 * s }} />
      {/* bowl */}
      <div style={{ width: 96 * s, height: 34 * s, borderRadius: `0 0 ${48 * s}px ${48 * s}px`, background: "linear-gradient(180deg, #b5683c, #6e3518)" }} />
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: `linear-gradient(180deg, ${f.theme.skyTop} 0%, ${f.theme.skyBottom} 70%, #3a2414 100%)`,
          color: f.theme.text,
        }}
      >
        {/* string lights */}
        <div style={{ position: "absolute", top: 34, left: 0, right: 0, display: "flex", justifyContent: "space-around", padding: "0 30px" }}>
          {Array.from({ length: 26 }).map((_, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 99, background: ["#ffd27a", "#ff8a5b", "#9ad0ff", "#ff9ad0"][i % 4], boxShadow: "0 0 14px 4px rgba(255,200,120,0.6)", marginTop: Math.sin((i / 25) * Math.PI * 3) * 14 + 14 }} />
          ))}
        </div>

        {/* row of diyas along the bottom */}
        {lamp(70, 470, 0.9, 0.85)}
        {lamp(250, 500, 0.7, 0.7)}
        {lamp(860, 500, 0.7, 0.7)}
        {lamp(1030, 470, 0.9, 0.85)}

        {lamp(552, 70, 1.3)}

        <div style={{ display: "flex", fontSize: 84, fontWeight: 800, marginTop: 120, letterSpacing: -1, color: "#ffd9a0" }}>
          {f.greetingAlt}
        </div>
        {from ? (
          <div style={{ display: "flex", fontSize: 48, marginTop: 6, color: f.theme.accent }}>from {from}</div>
        ) : null}
        {to ? (
          <div style={{ display: "flex", fontSize: 30, marginTop: 14, opacity: 0.85 }}>for {to}</div>
        ) : null}
        <div
          style={{
            display: "flex",
            marginTop: 34,
            padding: "14px 34px",
            borderRadius: 999,
            background: f.theme.accent,
            color: "#1a1206",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          Tap to open your gift
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
