import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: rawSize } = await params;
  const parsed = Number(rawSize);
  const size = parsed === 192 ? 192 : 512;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0a09",
          borderRadius: size * 0.18,
        }}
      >
        <div
          style={{
            width: "72%",
            height: "72%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: size * 0.16,
            border: `${Math.max(3, Math.round(size * 0.018))}px solid #8a6a3e`,
            background: "linear-gradient(145deg,#17130f,#0e0c0a)",
            color: "#efc27c",
            fontSize: size * 0.44,
            fontWeight: 700,
            fontFamily: "Georgia, serif",
          }}
        >
          L
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
