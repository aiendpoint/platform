import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
        }}
      >
        <div
          style={{
            background: "white",
            width: 28,
            height: 110,
            borderRadius: 14,
            transform: "rotate(-40deg)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
