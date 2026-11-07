import { formatPace } from "@/lib/format";
import type { Zone } from "@/lib/training/method";

/** Training zones: a table on wider screens, stacked rows on phones (no sideways scrolling). */
export function ZonesList({ zones }: { zones: Zone[] }) {
  return (
    <>
      <ul className="grid gap-2 sm:hidden">
        {zones.map((z) => (
          <li key={z.name} className="grid gap-0.5 rounded-lg bg-surface-2 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13.5px] font-semibold">{z.name}</span>
              <span className="font-mono text-[14px] font-semibold tabular-nums">
                {formatPace(z.from)}–{formatPace(z.to)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 text-[12.5px] text-muted">
              <span>{z.feel}</span>
              <span className="font-mono tabular-nums">{z.hr}</span>
            </div>
            {z.note ? <span className="text-[11.5px] text-muted">{z.note}</span> : null}
          </li>
        ))}
      </ul>
      <table className="hidden w-full text-left text-[13px] sm:table">
        <tbody>
          {zones.map((z) => (
            <tr key={z.name} className="border-b border-border/60 align-top last:border-0">
              <td className="py-1.5 pr-3 font-medium">{z.name}</td>
              <td className="py-1.5 pr-3 font-mono tabular-nums">
                {formatPace(z.from)}–{formatPace(z.to)} /km
                {z.note ? <span className="block font-sans text-[11.5px] text-muted">{z.note}</span> : null}
              </td>
              <td className="py-1.5 pr-3 font-mono tabular-nums text-muted">{z.hr}</td>
              <td className="py-1.5 text-muted">{z.feel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
