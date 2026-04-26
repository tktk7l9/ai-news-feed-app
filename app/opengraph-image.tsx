import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: "72px 80px",
          background: "linear-gradient(160deg, #fdf8f3 0%, #fef3c7 40%, #fde68a 100%)",
          position: "relative",
        }}
      >
        {/* Decorative amber orb */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,158,11,0.35) 0%, rgba(180,83,9,0.08) 70%, transparent 100%)",
          }}
        />

        {/* Logo badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
            marginBottom: 32,
          }}
        >
          <span style={{ color: "white", fontSize: 32, fontWeight: 800, fontFamily: "system-ui" }}>AI</span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#1c1410",
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1.1,
            letterSpacing: -2,
            marginBottom: 20,
          }}
        >
          AIニュース・ダイジェスト
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 32,
            color: "#78350f",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 400,
          }}
        >
          毎朝7時(JST)更新 — AI関連トピックの日本語まとめ
        </div>
      </div>
    ),
    { ...size },
  );
}
