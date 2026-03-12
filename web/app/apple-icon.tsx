import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#3b82f6",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 72,
            fontWeight: 800,
            fontFamily: "monospace",
            letterSpacing: "-3px",
            lineHeight: 1,
          }}
        >
          /ai
        </span>
      </div>
    ),
    { ...size }
  );
}
