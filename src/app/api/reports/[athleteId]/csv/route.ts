import { NextResponse, type NextRequest } from "next/server";
import { sessionsToCsv } from "@/lib/reports/csv";
import { fileSlug, loadReport } from "@/lib/reports/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params;
  const res = await loadReport(athleteId, new URL(request.url));
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  const { data } = res;
  const csv = sessionsToCsv(data.sessions, data.today);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vyra-${fileSlug(data.athlete.full_name)}-${data.from}_${data.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
