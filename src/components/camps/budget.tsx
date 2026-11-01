"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { saveCampBudget } from "@/lib/actions/camps";
import { formatPLN, type CampFormat } from "@/lib/camps";
import type { BudgetItem, CampBudget } from "@/lib/data/camps";
import { cn } from "@/lib/utils";
import { tl } from "@/lib/i18n/runtime";

type Row = { key: string; label: string; kind: "per_person" | "fixed"; amount: string; note: string };

const pln = (v: number) => formatPLN(Math.round(v)) ?? "–";
const num = (s: string) => {
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
let seq = 0;
const key = () => `r${Date.now().toString(36)}${seq++}`;

/** Starting assumptions from the VYRA camp analysis (to be replaced with real quotes). */
const TEMPLATES: Record<"weekend" | "week", Omit<Row, "key">[]> = {
  weekend: [
    { label: "Nocleg + pełne wyżywienie (2 noce)", kind: "per_person", amount: "1600", note: "hotel 4* z SPA, 800 zł/noc" },
    { label: "Test VO2max + mleczan", kind: "per_person", amount: "400", note: "laboratorium mobilne" },
    { label: "Masaż sportowy", kind: "per_person", amount: "150", note: "" },
    { label: "Pakiet powitalny (odzież VYRA)", kind: "per_person", amount: "250", note: "" },
    { label: "Ubezpieczenie, zalecenia dietetyka", kind: "per_person", amount: "130", note: "" },
    { label: "Fizjoterapeuta (honorarium + nocleg)", kind: "fixed", amount: "4600", note: "" },
    { label: "Nocleg i wyżywienie trenerów", kind: "fixed", amount: "3200", note: "2 osoby" },
    { label: "Dietetyk (menu + warsztat)", kind: "fixed", amount: "1500", note: "" },
    { label: "Sauna mobilna / cold plunge", kind: "fixed", amount: "1500", note: "jeśli obiekt nie ma" },
    { label: "Sprzęt (mata, kamera, siłownia, AED)", kind: "fixed", amount: "1500", note: "" },
    { label: "Zdjęcia i wideo", kind: "fixed", amount: "2500", note: "" },
    { label: "Transport lokalny", kind: "fixed", amount: "800", note: "" },
    { label: "Marketing", kind: "fixed", amount: "2000", note: "" },
  ],
  week: [
    { label: "Nocleg + pełne wyżywienie (7 nocy)", kind: "per_person", amount: "5250", note: "hotel 4* z SPA, 750 zł/noc" },
    { label: "Testy VO2max + mleczan (start i koniec)", kind: "per_person", amount: "800", note: "" },
    { label: "Badania krwi", kind: "per_person", amount: "300", note: "" },
    { label: "Masaż sportowy (3 zabiegi)", kind: "per_person", amount: "450", note: "" },
    { label: "Pakiet powitalny (odzież VYRA)", kind: "per_person", amount: "400", note: "" },
    { label: "Ubezpieczenie, zalecenia dietetyka", kind: "per_person", amount: "210", note: "" },
    { label: "Fizjoterapeuta (honorarium + nocleg)", kind: "fixed", amount: "12450", note: "" },
    { label: "Nocleg i wyżywienie trenerów", kind: "fixed", amount: "10500", note: "2 osoby" },
    { label: "Dietetyk (menu + warsztat)", kind: "fixed", amount: "3000", note: "" },
    { label: "Sauna mobilna / cold plunge", kind: "fixed", amount: "4000", note: "jeśli obiekt nie ma" },
    { label: "Sprzęt", kind: "fixed", amount: "2500", note: "" },
    { label: "Zdjęcia i wideo", kind: "fixed", amount: "5000", note: "" },
    { label: "Transport, wycieczki, wykładowca", kind: "fixed", amount: "6000", note: "" },
    { label: "Marketing", kind: "fixed", amount: "3000", note: "" },
  ],
};

function toRows(items: BudgetItem[]): Row[] {
  return items.map((i) => ({ key: key(), label: i.label, kind: i.kind, amount: String(i.amount_pln), note: i.note ?? "" }));
}

export function CampBudgetEditor({
  campId,
  format,
  price,
  enrolled,
  initial,
}: {
  campId: string;
  format: CampFormat;
  price: number | null;
  enrolled: number;
  initial: CampBudget | null;
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initial?.items ?? []));
  const [priceStr, setPriceStr] = useState(price == null ? "" : String(price));
  const [planned, setPlanned] = useState(String(initial?.planned_participants ?? 12));
  const [reserve, setReserve] = useState(String(initial?.reserve_pct ?? 10));
  const [founders, setFounders] = useState(String(initial?.founders ?? 2));
  const [pending, start] = useTransition();

  const calc = useMemo(() => {
    const p = num(priceStr);
    const r = num(reserve) / 100;
    const perPerson = rows.filter((x) => x.kind === "per_person").reduce((s, x) => s + num(x.amount), 0) * (1 + r);
    const fixed = rows.filter((x) => x.kind === "fixed").reduce((s, x) => s + num(x.amount), 0) * (1 + r);
    const f = Math.max(1, Math.round(num(founders)) || 1);
    const at = (n: number) => {
      const revenue = p * n;
      const costs = perPerson * n + fixed;
      const surplus = revenue - costs;
      return { n, revenue, costs, surplus, perFounder: surplus / f, margin: revenue ? surplus / revenue : 0, costPerPerson: n ? costs / n : 0 };
    };
    const unit = p - perPerson;
    const breakEven = unit > 0 ? Math.ceil(fixed / unit) : null;
    const plannedN = Math.max(1, Math.round(num(planned)) || 1);
    return { p, perPerson, fixed, breakEven, planned: at(plannedN), actual: at(enrolled), at, f };
  }, [rows, priceStr, reserve, founders, planned, enrolled]);

  const scenarios = Array.from({ length: 10 }, (_, i) => calc.at(i + 6));
  const maxAbs = Math.max(1, ...scenarios.map((s) => Math.abs(s.surplus)));

  const save = () =>
    start(async () => {
      const res = await saveCampBudget(campId, {
        planned_participants: Math.max(1, Math.round(num(planned)) || 1),
        reserve_pct: Math.min(100, num(reserve)),
        founders: Math.max(1, Math.min(10, Math.round(num(founders)) || 1)),
        items: rows
          .filter((x) => x.label.trim())
          .map((x) => ({ label: x.label.trim(), kind: x.kind, amount_pln: num(x.amount), note: x.note.trim() || null })),
      });
      if (res.ok) toast.success(res.message ?? tl("Zapisano", "Saved"));
      else toast.error(res.error);
    });

  const loadTemplate = (t: "weekend" | "week") => {
    if (rows.length && !window.confirm(tl("Zastąpić obecne koszty szablonem?", "Replace the current costs with the template?"))) return;
    setRows(TEMPLATES[t].map((x) => ({ ...x, key: key() })));
    if (!priceStr) setPriceStr(t === "weekend" ? "5990" : "14900");
  };

  const Result = ({ title, r }: { title: string; r: ReturnType<typeof calc.at> }) => (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <p className="text-sm font-semibold">
        {title} <span className="num font-normal text-muted">· {r.n} os.</span>
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">{tl("Przychód", "Revenue")}</dt>
        <dd className="num text-right">{pln(r.revenue)}</dd>
        <dt className="text-muted">{tl("Koszty z rezerwą", "Costs with reserve")}</dt>
        <dd className="num text-right">{pln(r.costs)}</dd>
        <dt className="text-muted">{tl("Koszt na uczestnika", "Cost per participant")}</dt>
        <dd className="num text-right">{r.n ? pln(r.costPerPerson) : "–"}</dd>
        <dt className="font-semibold">{tl("Nadwyżka", "Surplus")}</dt>
        <dd className={cn("num text-right text-base font-semibold", r.surplus >= 0 ? "text-done" : "text-problem")}>{pln(r.surplus)}</dd>
        <dt className="text-muted">{tl("Na założyciela", "Per founder")} ({calc.f})</dt>
        <dd className="num text-right">{pln(r.perFounder)}</dd>
        <dt className="text-muted">{tl("Marża", "Margin")}</dt>
        <dd className="num text-right">{r.revenue ? `${Math.round(r.margin * 100)}%` : "–"}</dd>
      </dl>
    </div>
  );

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{tl("Wynik", "Result")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label={tl("Cena za osobę", "Price per person")} unit="zł" htmlFor="b-price" hint={tl("Do kalkulacji; cenę na stronie zmieniasz w opisie obozu", "For the calculation; the price on the site is set in the camp details")}>
              <Input id="b-price" inputMode="numeric" value={priceStr} onChange={(e) => setPriceStr(e.target.value)} />
            </Field>
            <Field label={tl("Planowani uczestnicy", "Planned participants")} htmlFor="b-planned">
              <Input id="b-planned" inputMode="numeric" value={planned} onChange={(e) => setPlanned(e.target.value)} />
            </Field>
            <Field label={tl("Rezerwa", "Reserve")} unit="%" htmlFor="b-reserve">
              <Input id="b-reserve" inputMode="decimal" value={reserve} onChange={(e) => setReserve(e.target.value)} />
            </Field>
            <Field label={tl("Założyciele", "Founders")} htmlFor="b-founders" hint={tl("Podział nadwyżki", "Surplus split")}>
              <Input id="b-founders" inputMode="numeric" value={founders} onChange={(e) => setFounders(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Result title="Plan" r={calc.planned} />
            <Result title={tl("Teraz (zapisani i opłaceni)", "Now (registered and paid)")} r={calc.actual} />
          </div>
          <p className="text-sm">
            {calc.breakEven != null ? (
              <>
                <b>Próg opłacalności: {calc.breakEven} os.</b> <span className="text-muted">{tl("Od tylu uczestników obóz pokrywa wszystkie koszty.", "From this many participants the camp covers all costs.")}</span>
              </>
            ) : calc.p ? (
              <span className="text-problem">{tl("Cena nie pokrywa kosztów na osobę. Podnieś cenę albo obniż koszty na uczestnika.", "The price doesn’t cover the per-person costs. Raise the price or lower the per-participant costs.")}</span>
            ) : (
              <span className="text-muted">{tl("Wpisz cenę, żeby policzyć próg opłacalności.", "Enter a price to calculate the break-even point.")}</span>
            )}
          </p>
          {calc.p ? (
            <div className="grid gap-2">
              <p className="text-[13px] text-muted">{tl("Nadwyżka przy różnej liczbie uczestników", "Surplus by number of participants")}</p>
              <div className="grid gap-1">
                {scenarios.map((s) => (
                  <div key={s.n} className="grid grid-cols-[3rem_minmax(0,1fr)_6.5rem] items-center gap-3 text-sm">
                    <span className="num text-muted">{s.n} os.</span>
                    <span className="relative h-3 rounded-full bg-surface-2">
                      <span
                        className={cn("absolute inset-y-0 left-0 rounded-full", s.surplus >= 0 ? "bg-done/70" : "bg-problem/60")}
                        style={{ width: `${(Math.abs(s.surplus) / maxAbs) * 100}%` }}
                      />
                    </span>
                    <span className={cn("num text-right", s.surplus >= 0 ? "" : "text-problem")}>{pln(s.surplus)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{tl("Koszty", "Costs")}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => loadTemplate(format === "week" ? "week" : "weekend")}>
                {tl("Wczytaj szablon", "Load template")} ({format === "week" ? tl("tydzień", "week") : "weekend"})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          {rows.map((r, i) => (
            <div key={r.key} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_10rem_8rem_auto] sm:items-center">
              <Input
                aria-label={`Koszt ${i + 1}: nazwa`}
                value={r.label}
                placeholder={tl("np. Nocleg", "e.g. Accommodation")}
                onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, label: e.target.value } : x)))}
              />
              <Select
                aria-label={`Koszt ${i + 1}: rodzaj`}
                value={r.kind}
                onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, kind: e.target.value as Row["kind"] } : x)))}
              >
                <option value="per_person">{tl("na osobę", "per person")}</option>
                <option value="fixed">{tl("stały", "fixed")}</option>
              </Select>
              <Input
                aria-label={tl(`Koszt ${i + 1}: kwota w zł`, `Cost ${i + 1}: amount in PLN`)}
                inputMode="decimal"
                value={r.amount}
                placeholder="zł"
                onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, amount: e.target.value } : x)))}
              />
              <Button variant="ghost" size="icon-sm" aria-label={tl(`Usuń koszt ${i + 1}`, `Delete cost ${i + 1}`)} onClick={() => setRows(rows.filter((x) => x.key !== r.key))}>
                <Trash2 className="size-4" />
              </Button>
              {r.note ? <p className="text-[12px] text-subtle sm:col-span-4">{r.note}</p> : null}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setRows([...rows, { key: key(), label: "", kind: "per_person", amount: "", note: "" }])}>
              <Plus className="size-4" /> {tl("Koszt na osobę", "Per-person cost")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRows([...rows, { key: key(), label: "", kind: "fixed", amount: "", note: "" }])}>
              <Plus className="size-4" /> {tl("Koszt stały", "Fixed cost")}
            </Button>
          </div>
          <div className="grid gap-1 border-t border-border pt-3 text-sm">
            <p>
              {tl("Koszty na osobę (z rezerwą):", "Per-person costs (with reserve):")} <b className="num">{pln(calc.perPerson)}</b>
            </p>
            <p>
              {tl("Koszty stałe (z rezerwą):", "Fixed costs (with reserve):")} <b className="num">{pln(calc.fixed)}</b>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex items-center gap-3 rounded-lg border border-border bg-background/95 p-3 backdrop-blur lg:bottom-4">
        <Button disabled={pending} onClick={save}>
          {tl("Zapisz budżet", "Save budget")}
        </Button>
        <p className="text-[12px] text-muted">{tl("Widzą to tylko założyciele. Kwoty brutto, przed podatkami.", "Only founders see this. Gross amounts, before tax.")}</p>
      </div>
    </div>
  );
}
