import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { fileSlug, loadReport } from "@/lib/reports/data";
import { buildReportPdf } from "@/lib/reports/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params;
  const res = await loadReport(athleteId, new URL(request.url));
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  try {
    const root = process.cwd();
    const [fontRegular, fontBold, logo] = await Promise.all([
      readFile(path.join(root, "src/assets/fonts/DejaVuSans.ttf")),
      readFile(path.join(root, "src/assets/fonts/DejaVuSans-Bold.ttf")),
      readFile(path.join(root, "public/branding/vyra-logo-black.png")),
    ]);
    const bytes = await buildReportPdf(res.data, { fontRegular, fontBold, logo });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="vyra-raport-${fileSlug(res.data.athlete.full_name)}-${res.data.from}_${res.data.to}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[report:pdf]", e);
    return NextResponse.json({ error: "Nie udało się wygenerować raportu PDF." }, { status: 500 });
  }
}
