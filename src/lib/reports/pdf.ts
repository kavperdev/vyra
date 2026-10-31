import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { formatDate, formatDistance, formatDuration, formatNumber, formatPace } from "@/lib/format";
import { completionStats, runningTotals, weeklyBuckets } from "@/lib/training/analytics";
import { categoryLabel, KIND_LABEL } from "@/lib/training/categories";
import { displayStatus, STATUS_META } from "@/lib/training/status";
import type { ReportData } from "./data";

export interface PdfAssets {
  fontRegular: Uint8Array;
  fontBold: Uint8Array;
  /** Black VYRA wordmark PNG (public/branding/vyra-logo-black.png). */
  logo: Uint8Array;
}

const INK = rgb(0.035, 0.035, 0.043);
const MUTED = rgb(0.37, 0.37, 0.4);
const LINE = rgb(0.89, 0.89, 0.91);
const SOFT = rgb(0.965, 0.965, 0.97);
const RED = rgb(0.941, 0.2, 0.224); // brand accent #F03339

const A4 = { w: 595.28, h: 841.89 };
const M = 44;

function fit(text: string, font: PDFFont, size: number, width: number): string {
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > width) t = t.slice(0, -1);
  return `${t}…`;
}

export async function buildReportPdf(data: ReportData, assets: PdfAssets): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`VYRA — raport treningowy: ${data.athlete.full_name}`);
  pdf.setAuthor("VYRA");
  pdf.setCreator("VYRA");
  const regular = await pdf.embedFont(assets.fontRegular, { subset: true });
  const bold = await pdf.embedFont(assets.fontBold, { subset: true });
  const logo = await pdf.embedPng(assets.logo);

  const sessions = data.sessions;
  const comp = completionStats(sessions, data.from, data.to < data.today ? data.to : data.today);
  const run = runningTotals(sessions);
  const rpes = sessions.map((s) => s.execution?.rpe).filter((v): v is number => v != null);
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + Number(b), 0) / rpes.length : null;
  const days = differenceInCalendarDays(parseISO(data.to), parseISO(data.from)) + 1;
  const weeks = Math.min(16, Math.max(1, Math.ceil(days / 7)));
  const buckets = weeklyBuckets(sessions, data.to, weeks);

  const pages: PDFPage[] = [];
  const newPage = () => {
    const p = pdf.addPage([A4.w, A4.h]);
    pages.push(p);
    return p;
  };

  // ---------------------------------------------------------------- page 1 header
  let page = newPage();
  let y = A4.h - M;
  const logoW = 104;
  const logoH = (logo.height / logo.width) * logoW;
  page.drawImage(logo, { x: M, y: y - logoH, width: logoW, height: logoH });
  const label = "RAPORT TRENINGOWY";
  page.drawText(label, { x: A4.w - M - bold.widthOfTextAtSize(label, 8), y: y - logoH + 2, size: 8, font: bold, color: MUTED });
  y -= logoH + 26;

  page.drawText(data.athlete.full_name, { x: M, y, size: 22, font: bold, color: INK });
  y -= 18;
  page.drawText(`Okres: ${formatDate(data.from, "d MMMM yyyy")} – ${formatDate(data.to, "d MMMM yyyy")}`, { x: M, y, size: 10, font: regular, color: MUTED });
  y -= 14;
  page.drawRectangle({ x: M, y, width: 22, height: 1.5, color: RED });
  y -= 26;

  // ---------------------------------------------------------------- stats
  const stats: [string, string][] = [
    ["Treningi", `${comp.done} / ${sessions.length}`],
    ["Realizacja planu", comp.rate == null ? "–" : `${comp.rate}%`],
    ["Dystans", `${formatNumber(run.distanceM / 1000)} km`],
    ["Czas biegania", formatDuration(run.durationS)],
    ["Pominięte", String(comp.skipped)],
    ["Bez wpisu", String(comp.missing)],
    ["Śr. tempo", run.avgPaceS ? `${formatPace(run.avgPaceS)} /km` : "–"],
    ["Śr. RPE", avgRpe == null ? "–" : formatNumber(avgRpe)],
  ];
  const cols = 4;
  const gap = 8;
  const boxW = (A4.w - 2 * M - gap * (cols - 1)) / cols;
  const boxH = 48;
  stats.forEach(([k, v], i) => {
    const cx = M + (i % cols) * (boxW + gap);
    const cy = y - Math.floor(i / cols) * (boxH + gap) - boxH;
    page.drawRectangle({ x: cx, y: cy, width: boxW, height: boxH, color: SOFT });
    page.drawText(k.toUpperCase(), { x: cx + 10, y: cy + boxH - 15, size: 7, font: bold, color: MUTED });
    page.drawText(fit(v, bold, 15, boxW - 20), { x: cx + 10, y: cy + 12, size: 15, font: bold, color: INK });
  });
  y -= 2 * boxH + gap + 30;

  // ---------------------------------------------------------------- weekly volume chart
  page.drawText("Objętość biegowa w tygodniach (km)", { x: M, y, size: 10, font: bold, color: INK });
  page.drawRectangle({ x: A4.w - M - 150, y: y, width: 8, height: 8, color: INK });
  page.drawText("wykonane", { x: A4.w - M - 138, y: y + 0.5, size: 8, font: regular, color: MUTED });
  page.drawRectangle({ x: A4.w - M - 80, y: y, width: 8, height: 8, borderColor: MUTED, borderWidth: 0.8 });
  page.drawText("plan", { x: A4.w - M - 68, y: y + 0.5, size: 8, font: regular, color: MUTED });
  y -= 14;
  const chartH = 120;
  const chartW = A4.w - 2 * M - 28;
  const chartX = M + 28;
  const chartY = y - chartH;
  const maxKm = Math.max(10, ...buckets.map((b) => Math.max(b.actualKm, b.plannedKm)));
  const top = Math.ceil(maxKm / 10) * 10;
  for (const t of [0, top / 2, top]) {
    const ty = chartY + (t / top) * chartH;
    page.drawLine({ start: { x: chartX, y: ty }, end: { x: chartX + chartW, y: ty }, thickness: 0.5, color: LINE });
    const lbl = formatNumber(t, 0);
    page.drawText(lbl, { x: chartX - 6 - regular.widthOfTextAtSize(lbl, 7), y: ty - 2.5, size: 7, font: regular, color: MUTED });
  }
  const slot = chartW / buckets.length;
  const barW = Math.min(18, slot * 0.32);
  buckets.forEach((b, i) => {
    const cx = chartX + i * slot + slot / 2;
    if (b.plannedKm > 0) {
      const h = (b.plannedKm / top) * chartH;
      page.drawRectangle({ x: cx - barW - 1, y: chartY, width: barW, height: h, borderColor: MUTED, borderWidth: 0.7 });
    }
    if (b.actualKm > 0) {
      const h = (b.actualKm / top) * chartH;
      page.drawRectangle({ x: cx + 1, y: chartY, width: barW, height: h, color: INK });
    }
    const wl = formatDate(b.weekStart, "d.MM");
    page.drawText(wl, { x: cx - regular.widthOfTextAtSize(wl, 7) / 2, y: chartY - 11, size: 7, font: regular, color: MUTED });
  });
  y = chartY - 34;

  // ---------------------------------------------------------------- sessions table
  const columns = [
    { key: "date", label: "Data", w: 52 },
    { key: "title", label: "Trening", w: 130 },
    { key: "type", label: "Rodzaj", w: 72 },
    { key: "plan", label: "Plan", w: 62 },
    { key: "actual", label: "Wykonanie", w: 112 },
    { key: "rpe", label: "RPE", w: 26 },
    { key: "status", label: "Status", w: 53 },
  ] as const;
  const rowH = 17;

  const drawHeader = () => {
    page.drawText("Treningi w okresie", { x: M, y, size: 10, font: bold, color: INK });
    y -= 16;
    let x = M;
    for (const c of columns) {
      page.drawText(c.label.toUpperCase(), { x, y, size: 6.5, font: bold, color: MUTED });
      x += c.w;
    }
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.6, color: LINE });
    y -= 12;
  };
  drawHeader();

  if (!sessions.length) {
    page.drawText("Brak treningów w wybranym okresie.", { x: M, y, size: 9, font: regular, color: MUTED });
  }

  for (const s of sessions) {
    if (y < M + 40) {
      page = newPage();
      y = A4.h - M;
      drawHeader();
    }
    const e = s.execution;
    const plan = s.planned_distance_m ? formatDistance(s.planned_distance_m) : s.planned_duration_s ? formatDuration(s.planned_duration_s) : "–";
    const actual = e
      ? [e.distance_m ? formatDistance(e.distance_m) : null, e.duration_s ? formatDuration(e.duration_s) : null, e.avg_pace_s ? `${formatPace(e.avg_pace_s)}/km` : null, e.avg_hr ? `${e.avg_hr} bpm` : null]
          .filter(Boolean)
          .join(" · ") || "zapisano"
      : "–";
    const ds = displayStatus(s.status, s.scheduled_date, data.today);
    const values: Record<(typeof columns)[number]["key"], string> = {
      date: formatDate(s.scheduled_date, "dd.MM.yy"),
      title: s.title,
      type: `${KIND_LABEL[s.kind]} · ${categoryLabel(s.category)}`,
      plan,
      actual,
      rpe: e?.rpe != null ? formatNumber(e.rpe) : "–",
      status: STATUS_META[ds].label,
    };
    let x = M;
    for (const c of columns) {
      const font = c.key === "title" ? bold : regular;
      const color = c.key === "status" && (ds === "skipped" || ds === "needs_update") ? RED : c.key === "type" || c.key === "plan" ? MUTED : INK;
      page.drawText(fit(values[c.key], font, 8, c.w - 6), { x, y, size: 8, font, color });
      x += c.w;
    }
    y -= rowH - 6;
    page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.4, color: LINE });
    y -= 10;
  }

  // ---------------------------------------------------------------- footers
  const generated = `Wygenerowano ${formatDate(new Date().toISOString(), "d.MM.yyyy HH:mm")}`;
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: M - 14 }, end: { x: A4.w - M, y: M - 14 }, thickness: 0.4, color: LINE });
    p.drawText("VYRA · ELITE IS STANDARD", { x: M, y: M - 26, size: 7, font: bold, color: INK });
    const right = `${generated} · strona ${i + 1}/${pages.length}`;
    p.drawText(right, { x: A4.w - M - regular.widthOfTextAtSize(right, 7), y: M - 26, size: 7, font: regular, color: MUTED });
  });

  return pdf.save();
}
