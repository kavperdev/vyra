import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/lib/data/clubs";
import { loadClubWorkspace } from "@/lib/data/club-management";
import { loadGrantReport, reportCsv, type GrantReport } from "@/lib/data/club-reports";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const isDate = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const fmt = (iso: string) => iso.split("-").reverse().join(".");
const esc = (s: string | number | null) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Grant report for the coach's club as a printable page (`format=html`) or a CSV file (`format=csv`). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "coach") return new Response("Brak dostępu", { status: 403 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!isDate(from) || !isDate(to) || from! > to!) return new Response("Podaj poprawny okres", { status: 400 });
  const supabase = await createClient();
  const asked = url.searchParams.get("club");
  let club: { id: string; name: string; city: string | null } | null = null;
  if (asked && user.profile.staff_role === "founder") {
    const { data } = await supabase.from("sport_clubs").select("id, name, city").eq("id", asked).maybeSingle();
    club = data as typeof club;
  } else club = await getMyClub(supabase, user.id);
  if (!club) return new Response("Nie należysz do klubu", { status: 404 });
  const ws = await loadClubWorkspace(supabase, club.id, from!, to!);
  const group = url.searchParams.get("group");
  const report = await loadGrantReport(supabase, ws, club.id, from!, to!, group && ws.groups.some((g) => g.id === group) ? group : null);
  const name = `raport_${club.name.replace(/[^\p{L}\p{N}]+/gu, "_")}_${from}_${to}`;

  if (url.searchParams.get("format") === "csv") {
    return new Response(reportCsv(report, club.name), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}.csv`, "cache-control": "no-store" },
    });
  }
  return new Response(printable(report, club, user.profile.full_name), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

function printable(r: GrantReport, club: { name: string; city: string | null }, author: string) {
  const rate = (p: number, m: number) => (m ? `${Math.round((p / m) * 100)}%` : "—");
  const rows = r.athletes
    .map((a, i) => `<tr><td>${i + 1}</td><td>${esc(a.name)}</td><td>${esc(a.birth_year ?? "")}</td><td>${esc(a.groups.join(", "))}</td><td class="n">${a.present} / ${a.marked}</td><td class="n">${rate(a.present, a.marked)}</td></tr>`)
    .join("");
  const classes = r.occurrences
    .map((o) => `<tr><td>${fmt(o.date)}</td><td>${esc(o.start)}${o.end ? `–${esc(o.end)}` : ""}</td><td>${esc(o.title)}</td><td>${esc(o.place ?? "")}</td></tr>`)
    .join("");
  const comps = r.competitions.map((c) => `<tr><td>${fmt(c.date)}</td><td>${esc(c.title)}</td><td>${esc(c.place ?? "")}</td></tr>`).join("");
  const recs = r.records.map((x) => `<tr><td>${fmt(x.date)}</td><td>${esc(x.athlete)}</td><td>${esc(x.label)}</td><td class="n">${esc(x.value)}</td></tr>`).join("");
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Raport ${esc(club.name)} ${fmt(r.from)}–${fmt(r.to)}</title>
<style>
@page{size:A4;margin:16mm 14mm}*{box-sizing:border-box}body{font:10.5pt/1.45 system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#111;margin:0}
h1{font-size:16pt;margin:0 0 2mm}h2{font-size:11.5pt;margin:7mm 0 2mm;border-bottom:1px solid #111;padding-bottom:1mm}
.meta{color:#444;margin:0 0 5mm}.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:4mm 0}.kpi div{border:1px solid #ccc;border-radius:2mm;padding:3mm}.kpi b{display:block;font-size:15pt}
table{width:100%;border-collapse:collapse;font-size:9.5pt}th,td{border-bottom:1px solid #ddd;padding:1.4mm 2mm;text-align:left;vertical-align:top}th{font-weight:600;background:#f3f3f3}.n{text-align:right;font-variant-numeric:tabular-nums}
.note{color:#555;font-size:9pt;margin-top:6mm}.bar{display:flex;gap:8px;margin:12px 0}.bar button{font:inherit;padding:8px 14px;border:1px solid #111;background:#111;color:#fff;border-radius:6px;cursor:pointer}
@media print{.bar{display:none}}
</style></head><body><main style="max-width:190mm;margin:0 auto;padding:8mm 0">
<div class="bar"><button onclick="window.print()">Drukuj lub zapisz PDF</button></div>
<h1>Sprawozdanie z realizacji zajęć: ${esc(club.name)}</h1>
<p class="meta">Okres: ${fmt(r.from)} – ${fmt(r.to)} · Grupa: ${esc(r.groupName ?? "wszystkie")}${club.city ? ` · ${esc(club.city)}` : ""}</p>
<div class="kpi"><div>Zajęcia odbyte<b>${r.occurrences.length}</b></div><div>Godziny zajęć<b>${r.hours.toLocaleString("pl-PL")}</b></div><div>Uczestnicy<b>${r.athletes.length}</b></div><div>Zajęcia odwołane<b>${r.cancelled}</b></div></div>
<h2>Lista uczestników i frekwencja</h2>
<table><thead><tr><th>Lp.</th><th>Imię i nazwisko</th><th>Rocznik</th><th>Grupa</th><th class="n">Obecności</th><th class="n">Frekwencja</th></tr></thead><tbody>${rows || `<tr><td colspan="6">Brak uczestników</td></tr>`}</tbody></table>
<h2>Zajęcia</h2>
<table><thead><tr><th>Data</th><th>Godzina</th><th>Zajęcia</th><th>Miejsce</th></tr></thead><tbody>${classes || `<tr><td colspan="4">Brak zajęć w harmonogramie</td></tr>`}</tbody></table>
<h2>Udział w zawodach</h2>
<table><thead><tr><th>Data</th><th>Zawody</th><th>Miejsce</th></tr></thead><tbody>${comps || `<tr><td colspan="3">Brak zawodów w kalendarzu klubu</td></tr>`}</tbody></table>
<h2>Rekordy życiowe uzyskane w okresie</h2>
<table><thead><tr><th>Data</th><th>Zawodnik</th><th>Konkurencja</th><th class="n">Wynik</th></tr></thead><tbody>${recs || `<tr><td colspan="4">Brak nowych rekordów</td></tr>`}</tbody></table>
${r.tests.length ? `<h2>Testy sprawności</h2><p>${r.tests.map((t) => `${fmt(t.date)}: ${t.count} wyników`).join(" · ")}</p>` : ""}
<p class="note">Zestawienie przygotował(a): ${esc(author)}. Dane z platformy VYRA (harmonogram, obecność, kalendarz zawodów, rekordy). Frekwencja liczona z zajęć, na których odnotowano obecność.</p>
</main><script>setTimeout(function(){window.print()},400)</script></body></html>`;
}
