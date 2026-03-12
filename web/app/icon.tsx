import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
            width: 4,
            height: 20,
            borderRadius: 3,
            transform: "rotate(40deg)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
