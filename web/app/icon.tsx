import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 13,
            fontWeight: 800,
            fontFamily: "monospace",
            letterSpacing: "-0.5px",
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
