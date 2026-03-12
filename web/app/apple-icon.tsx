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
          borderRadius: "50%",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 110,
            fontWeight: 900,
            fontFamily: "monospace",
            lineHeight: 1,
            marginTop: -4,
          }}
        >
          /
        </span>
      </div>
    ),
    { ...size }
  );
}
