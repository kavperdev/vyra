import { Check, Minus } from "lucide-react";

/**
 * What is free, what is VYRA Method, what is a 1:1 coach. Free = tools and group plans;
 * Method = a plan made for you that adapts; coach = a person who watches every session.
 */
const ROWS: [string, boolean, boolean, boolean][] = [
  ["Dziennik, Strava, Forma, rekordy", true, true, true],
  ["Zacznij biegać i Nocna Ekipa (plan grupowy)", true, true, true],
  ["Zestawy: rozgrzewka, mobilność, siła na start", true, true, true],
  ["Kurs, ćwiczenia, timer, kalkulatory", true, true, true],
  ["Osobisty plan pod Twój start, z tempami", false, true, true],
  ["Plan liczony co tydzień od nowa z tego, co zrobiłeś", false, true, true],
  ["Ból albo zmęczenie: następny tydzień lżej", false, true, true],
  ["Siła biegacza A/B rosnąca co 4 treningi", false, true, true],
  ["Strategia na start, obciążenie i ryzyko", false, true, true],
  ["Trener, który ogląda każdy Twój trening", false, false, true],
  ["Rozmowa z trenerem i zmiany na żądanie", false, false, true],
];

const Mark = ({ on, hi }: { on: boolean; hi?: boolean }) => (
  <span className="grid w-12 place-items-center">{on ? <Check className={hi ? "size-4 text-emerald-300" : "size-4 text-white/60"} /> : <Minus className="size-4 text-white/20" />}</span>
);

export function MethodCompare({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111113]">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-1.5 border-b border-white/[0.06] px-4 py-2.5 text-[11px] leading-tight text-white/45">
          <span />
          <span className="w-12 text-center">Za darmo</span>
          <span className="w-12 text-center font-semibold text-white">Method</span>
          <span className="w-12 text-center">Trener 1:1</span>
        </div>
        {ROWS.map(([label, free, method, coach]) => (
          <div key={label} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-1.5 border-b border-white/[0.04] px-4 py-2.5 last:border-0">
            <span className="text-[13px] leading-snug text-white/80">{label}</span>
            <Mark on={free} />
            <Mark on={method} hi />
            <Mark on={coach} />
          </div>
        ))}
      </div>
    </div>
  );
}
