import { Check, Minus } from "lucide-react";

/**
 * Free plan vs VYRA Method side by side. The panel showed the free plan answers most needs,
 * so the paid part has to be named in plain words where people decide.
 */
const ROWS: [string, boolean, boolean][] = [
  ["Plan tydzień po tygodniu z tempami", true, true],
  ["Timer, GPS, dziennik, Strava", true, true],
  ["Każdy tydzień liczony od nowa z tego, co zrobiłeś", false, true],
  ["Niepełny tydzień? Następny nie dokłada obciążenia", false, true],
  ["Ból albo zmęczenie: następny tydzień tylko spokojnie", false, true],
  ["Tempa przeliczane po każdym teście formy", false, true],
  ["Metoda trenerów, którzy prowadzą czwartkowy Run Club", false, true],
];

export function MethodCompare({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111113]">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-b border-white/[0.06] px-4 py-2.5 text-[11.5px] text-white/45">
          <span />
          <span className="w-14 text-center">Za darmo</span>
          <span className="w-14 text-center font-semibold text-white">Method</span>
        </div>
        {ROWS.map(([label, free, method]) => (
          <div key={label} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-b border-white/[0.04] px-4 py-2.5 last:border-0">
            <span className="text-[13.5px] leading-snug text-white/80">{label}</span>
            <span className="grid w-14 place-items-center">{free ? <Check className="size-4 text-white/60" /> : <Minus className="size-4 text-white/20" />}</span>
            <span className="grid w-14 place-items-center">{method ? <Check className="size-4 text-emerald-300" /> : <Minus className="size-4 text-white/20" />}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
