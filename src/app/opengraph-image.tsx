import { OG_SIZE, ogImage } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "VYRA · Elite is standard";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Performance culture", title: "Trening biegowy, siła i regeneracja. Prowadzenie i obozy." });
}
