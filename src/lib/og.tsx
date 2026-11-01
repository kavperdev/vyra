import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

let assets: Promise<{ font: Buffer; photo: string }> | null = null;
function loadAssets() {
  assets ??= (async () => {
    const root = process.cwd();
    const [font, photo] = await Promise.all([
      readFile(path.join(root, "src/assets/fonts/DejaVuSans-Bold.ttf")),
      readFile(path.join(root, "public/site/hero.jpg")),
    ]);
    return { font, photo: `data:image/jpeg;base64,${photo.toString("base64")}` };
  })();
  return assets;
}

/** Link preview image in the VYRA style: photo, eyebrow, big title, wordmark. */
export async function ogImage({ eyebrow, title, footer }: { eyebrow: string; title: string; footer?: string }) {
  const { font, photo } = await loadAssets();
  const size = title.length > 60 ? 54 : title.length > 34 ? 66 : 82;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#000", fontFamily: "VYRA" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          src={photo}
          width={1200}
          height={630}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.45 }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0.35) 100%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#fff", fontSize: 30, letterSpacing: 14 }}>VYRA</span>
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 18, letterSpacing: 6 }}>ELITE IS STANDARD</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <span style={{ color: "#F03339", fontSize: 22, letterSpacing: 6, textTransform: "uppercase" }}>{eyebrow}</span>
            <span style={{ color: "#fff", fontSize: size, lineHeight: 1.04, maxWidth: 1000 }}>{title}</span>
            {footer ? <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 26 }}>{footer}</span> : null}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: "VYRA", data: font, weight: 700, style: "normal" }] },
  );
}
