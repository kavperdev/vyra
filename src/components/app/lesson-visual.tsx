import { CircleCheck, CircleAlert, CircleX } from "lucide-react";
import { WorkoutBars } from "@/components/app/workout-bars";
import { ExerciseStrip } from "@/components/app/exercise-strip";
import { parseShape } from "@/lib/app/workout-shape";

const box = "rounded-[20px] border border-white/[0.06] bg-[radial-gradient(120%_90%_at_20%_100%,rgba(229,52,59,0.16),transparent_60%)] bg-[#111113] p-4";
const cap = "mt-2 text-[12px] text-white/45";

/** 80/20: most running easy. */
function EightyTwenty() {
  return (
    <div className={box}>
      <div className="flex h-14 overflow-hidden rounded-xl">
        <div className="grid w-[80%] place-items-center bg-emerald-300/75 text-[20px] font-semibold text-black">80%</div>
        <div className="grid w-[20%] place-items-center bg-[#ff5a60] text-[16px] font-semibold">20%</div>
      </div>
      <div className="mt-2 flex justify-between text-[12.5px]">
        <span className="text-emerald-200/90">spokojnie, mówisz zdaniami</span>
        <span className="text-[#ff8a8f]">mocno</span>
      </div>
    </div>
  );
}

/** Weekly volume: +10% a week, every 4th week lighter. */
function Volume() {
  const w = [20, 22, 24, 17, 24, 26.5, 29, 21];
  const max = 30;
  return (
    <div className={box}>
      <div className="flex h-28 items-end gap-1.5">
        {w.map((v, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div className={(i + 1) % 4 === 0 ? "w-full rounded-md bg-emerald-300/60" : "w-full rounded-md bg-white/80"} style={{ height: `${(v / max) * 85}%` }} />
            <span className="text-[10.5px] tabular-nums text-white/40">T{i + 1}</span>
          </div>
        ))}
      </div>
      <p className={cap}>
        Max ok. +10% na tydzień, co 4. tydzień <span className="text-emerald-200/90">lżej</span>.
      </p>
    </div>
  );
}

/** Training load → fatigue → stronger than before (supercompensation). */
function Recovery() {
  return (
    <div className={box}>
      <svg viewBox="0 0 300 110" className="w-full">
        <line x1="0" y1="55" x2="300" y2="55" stroke="rgba(255,255,255,0.18)" strokeDasharray="4 4" />
        <path d="M0 55 C 40 55, 50 95, 90 95 S 150 30, 190 30 S 260 50, 300 52" fill="none" stroke="#ff5a60" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="90" cy="95" r="5" fill="#fff" />
        <circle cx="190" cy="30" r="5" fill="#6ee7b7" />
        <text x="8" y="48" fill="rgba(255,255,255,0.5)" fontSize="11">forma dziś</text>
        <text x="102" y="82" fill="rgba(255,255,255,0.7)" fontSize="11">zmęczenie</text>
        <text x="200" y="24" fill="#6ee7b7" fontSize="11">mocniej niż przed</text>
      </svg>
      <p className={cap}>Trening męczy. Forma rośnie w trakcie odpoczynku.</p>
    </div>
  );
}

/** Pain or fatigue: traffic light. */
function Lights() {
  const rows = [
    { i: <CircleCheck className="size-6 text-emerald-300" />, t: "Ogólne zmęczenie, ciężkie nogi", s: "Biegnij spokojnie" },
    { i: <CircleAlert className="size-6 text-amber-300" />, t: "Ból 3–4/10, mija po rozgrzewce", s: "Lżej, obserwuj" },
    { i: <CircleX className="size-6 text-[#ff5a60]" />, t: "Ostry, punktowy, zmienia krok", s: "Stop, odpocznij" },
  ];
  return (
    <div className={`${box} grid gap-3`}>
      {rows.map((r) => (
        <div key={r.t} className="flex items-center gap-3">
          {r.i}
          <div className="min-w-0">
            <p className="text-[14px] font-medium leading-snug">{r.t}</p>
            <p className="text-[12.5px] text-white/50">{r.s}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Even pacing: first km calm, finish strong. */
function Pacing() {
  const km = [4.2, 4.0, 4.0, 4.0, 3.95, 3.95, 3.9, 3.9, 3.85, 3.75];
  return (
    <div className={box}>
      <div className="flex h-24 items-end gap-1">
        {km.map((v, i) => (
          <div key={i} className="flex-1 rounded-md" style={{ height: `${((4.4 - v) / 0.7) * 100}%`, background: i === 0 ? "rgba(255,255,255,0.35)" : i >= 7 ? "#ff5a60" : "rgba(255,255,255,0.8)" }} />
        ))}
      </div>
      <p className={cap}>1. km spokojniej, środek równo, końcówka najszybsza.</p>
    </div>
  );
}

function Layers() {
  const rows = [
    ["powyżej 15°C", "koszulka + krótkie spodenki"],
    ["5–15°C", "długi rękaw, cienkie getry"],
    ["0–5°C", "2 warstwy, czapka, rękawiczki"],
    ["poniżej 0°C", "3 warstwy, buff, odblask"],
  ];
  return (
    <div className={`${box} divide-y divide-white/[0.06] py-1`}>
      {rows.map(([a, b]) => (
        <div key={a} className="flex items-center justify-between gap-3 py-2.5">
          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#ff8a8f]">{a}</span>
          <span className="text-right text-[13px] text-white/75">{b}</span>
        </div>
      ))}
      <p className="pt-2.5 text-[12px] text-white/45">Ubierz się tak, jakby było 10° cieplej.</p>
    </div>
  );
}

/** The picture at the top of each course lesson. */
export function LessonVisual({ slug }: { slug: string }) {
  switch (slug) {
    case "jak-zaczac":
      return (
        <div className={box}>
          <WorkoutBars segs={parseShape("k5 8x1/2@2.6 k3")} />
          <p className={cap}>Start: 1 min biegu, 2 min marszu, 8 razy. Co tydzień więcej biegu.</p>
        </div>
      );
    case "tempo-rozmowy":
      return <EightyTwenty />;
    case "ile-biegac":
      return <Volume />;
    case "rozgrzewka":
      return <ExerciseStrip slugs={["wymachy-nog", "skip-a", "skip-c", "przebiezka"]} />;
    case "buty-i-stroj":
      return <Layers />;
    case "sila":
      return <ExerciseStrip slugs={["przysiad", "wykroki", "wspiecia-na-palce", "most-biodrowy", "deska", "martwy-ciag-jednonoz"]} />;
    case "regeneracja":
      return <Recovery />;
    case "bol-czy-zmeczenie":
      return <Lights />;
    case "pierwszy-start":
      return <Pacing />;
    default:
      return null;
  }
}
