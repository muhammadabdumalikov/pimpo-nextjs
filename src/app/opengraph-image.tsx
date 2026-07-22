import { ImageResponse } from "next/og";

// Site-wide Open Graph / Twitter share card, generated at build time.
// Telegram/social unfurls were blank without it.
export const alt = "KPOS — do'kon uchun kassa, ombor va nasiya daftari";
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
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f1435 0%, #1e2761 60%, #2a3990 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              background: "#465fff",
              borderRadius: "16px",
              padding: "12px 28px",
              fontSize: "56px",
              fontWeight: 800,
              letterSpacing: "-1px",
            }}
          >
            KPOS
          </div>
        </div>
        <div
          style={{
            marginTop: "48px",
            fontSize: "64px",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-2px",
            maxWidth: "900px",
          }}
        >
          Do&apos;koningizni boshqaring — nasiya bilan birga
        </div>
        <div
          style={{
            marginTop: "28px",
            fontSize: "32px",
            color: "rgba(255,255,255,0.75)",
            maxWidth: "820px",
          }}
        >
          Kassa · Ombor · Nasiya daftari · Hisobotlar
        </div>
        <div
          style={{
            marginTop: "auto",
            fontSize: "28px",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          kpos.uz
        </div>
      </div>
    ),
    { ...size },
  );
}
