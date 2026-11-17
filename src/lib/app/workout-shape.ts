/**
 * A workout as a picture: blocks whose width is time and height is effort.
 * Built from a tiny text spec, or read from a plan session (its timer and description).
 */
export type SegT = "warm" | "easy" | "work" | "rest" | "cool" | "race" | "walk";
export type Seg = { t: SegT; sec: number; lvl: number }; // lvl 1 (very easy) … 5 (very hard)

/**
 * Spec tokens (minutes): w15 warm-up · c10 cool-down · e40 easy · g25 recovery · m20 marathon pace ·
 * t20 tempo · R25 race · k5 walk · 5x4/2 reps (work/rest) with optional @lvl (default 4).
 */
export function parseShape(spec: string): Seg[] {
  const out: Seg[] = [];
  for (const tok of spec.trim().split(/\s+/)) {
    const rep = tok.match(/^(\d+)x([\d.]+)\/([\d.]+)(?:@([\d.]+))?$/);
    if (rep) {
      const n = Number(rep[1]);
      const lvl = rep[4] ? Number(rep[4]) : 4;
      for (let i = 0; i < n; i++) {
        out.push({ t: "work", sec: Number(rep[2]) * 60, lvl });
        if (Number(rep[3]) > 0) out.push({ t: "rest", sec: Number(rep[3]) * 60, lvl: 1 });
      }
      continue;
    }
    const m = tok.match(/^([wcegmtRk])([\d.]+)$/);
    if (!m) continue;
    const sec = Number(m[2]) * 60;
    const map: Record<string, Seg> = {
      w: { t: "warm", sec, lvl: 1.6 },
      c: { t: "cool", sec, lvl: 1.4 },
      e: { t: "easy", sec, lvl: 2 },
      g: { t: "easy", sec, lvl: 1.4 },
      m: { t: "work", sec, lvl: 3 },
      t: { t: "work", sec, lvl: 3.6 },
      R: { t: "race", sec, lvl: 4.6 },
      k: { t: "walk", sec, lvl: 1 },
    };
    out.push(map[m[1]]);
  }
  return out;
}

/** The workout library, drawn. */
export const LIBRARY_SHAPES: Record<string, string> = {
  "bieg-spokojny": "e40",
  regeneracja: "g25",
  "dlugie-wybieganie": "e75 m15",
  "bieg-z-marszem": "k5 6x2/1.5@2 k3",
  "tempo-ciagle": "w15 t25 c10",
  "odcinki-progowe": "w15 4x6/1.5@3.6 c10",
  "sub-threshold": "w15 3x10/1@3.3 c10",
  "interwaly-1000": "w15 5x3.8/2.5@4.2 c10",
  "interwaly-400": "w15 10x1.4/1.2@4.6 c10",
  "30-30": "w15 12x0.5/0.5@4.6 c10",
  fartlek: "w12 8x1/1@4 c10",
  przebiezki: "e30 6x0.33/1@4.6",
  "podbiegi-krotkie": "w15 10x0.25/1.5@5 c10",
  "podbiegi-dlugie": "w15 6x1.5/2@4.3 c10",
  "test-5-km": "w15 R21 c10",
  "rozgrzewka-startowa": "w12 4x0.25/0.75@4.4",
  "tydzien-przed-startem": "w15 3x3/2@4 c10",
};

/** Reads a plan session: warm-up and cool-down from the text, reps from the timer, strides at the end. */
export function sessionShape(s: { kind: string; desc: string; km: number; pace: [number, number] | null; timer: string | null }): Seg[] {
  const out: Seg[] = [];
  const num = (re: RegExp) => {
    const m = s.desc.match(re);
    return m ? Number(m[1].replace(",", ".")) : 0;
  };
  const warm = num(/Rozgrzewka (\d+) min/);
  const cool = num(/Schłodzenie (\d+) min/);
  if (warm) out.push({ t: "warm", sec: warm * 60, lvl: 1.6 });
  const q = s.timer ? new URLSearchParams(s.timer.split("?")[1] ?? "") : null;
  const pace = s.pace ? (s.pace[0] + s.pace[1]) / 2 : 360;
  if (q && q.get("n")) {
    const n = Number(q.get("n"));
    const w = Number(q.get("w"));
    const r = Number(q.get("r"));
    const lvl = w <= 75 ? 4.7 : w <= 240 ? 4.3 : 3.6;
    for (let i = 0; i < n; i++) {
      out.push({ t: "work", sec: w, lvl });
      if (r) out.push({ t: "rest", sec: r, lvl: 1 });
    }
  } else if (s.kind === "race") {
    out.push({ t: "race", sec: s.km * pace, lvl: 4.6 });
  } else {
    const tempo = num(/(\d+) min ciągiem/);
    const finish = num(/ostatnie (\d+) km w tempie startowym/);
    if (tempo) out.push({ t: "work", sec: tempo * 60, lvl: 3.6 });
    else {
      const mainKm = Math.max(0.5, s.km - (warm + cool) / 6 - finish);
      out.push({ t: "easy", sec: mainKm * pace, lvl: s.kind === "shake" ? 1.4 : 2 });
      if (finish) out.push({ t: "work", sec: finish * pace * 0.9, lvl: 3.8 });
    }
  }
  const strides = s.desc.match(/(\d+) × 20 s przebieżki/);
  if (strides) for (let i = 0; i < Number(strides[1]); i++) out.push({ t: "work", sec: 20, lvl: 4.6 }, { t: "rest", sec: 50, lvl: 1 });
  if (cool) out.push({ t: "cool", sec: cool * 60, lvl: 1.4 });
  return out;
}
