/**
 * Karuzela na Instagram: plan tygodnia Nocnej Ekipy VYRA.
 * Użycie: node --experimental-strip-types scripts/nocna-karuzela.mts <tydzień 1-24> <katalog-wyjściowy>
 * Wymaga: playwright (chromium) i fontu Inter w systemie.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LEVELS, NOCNA, ZONE_NAME, byFeel, levelZones, nocnaWeek, paceText, resolveLine, type NLevel } from "../src/lib/app/nocna-plan.ts";

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)("playwright");
const n = Number(process.argv[2] ?? 1);
const out = process.argv[3] ?? "./karuzela";
mkdirSync(out, { recursive: true });
copyFileSync(join(here, "vyra-logo-white.png"), join(out, "logo.png"));

const pl = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pl-PL", { day: "numeric", month: "long", timeZone: "UTC" });
const plus = (iso: string, d: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + d * 86400000).toISOString().slice(0, 10);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const CSS = `*{margin:0;box-sizing:border-box}
body{width:1080px;height:1350px;background:#000;color:#fff;font-family:"Inter Display",Inter,sans-serif;overflow:hidden;position:relative}
.g{position:absolute;border-radius:50%}.logo{position:absolute;left:84px;top:84px;height:28px}
.pg{position:absolute;right:84px;top:80px;font-size:28px;letter-spacing:.12em;color:rgba(255,255,255,.45)}
.w{position:absolute;left:84px;right:84px}h1{font-weight:700;letter-spacing:-.035em;line-height:.98}
.m{color:rgba(255,255,255,.55)}.red{color:#ff5a60}
.foot{position:absolute;left:84px;right:84px;bottom:76px;display:flex;justify-content:space-between;font-size:28px;color:rgba(255,255,255,.4)}
.day{display:grid;grid-template-columns:230px 1fr;gap:20px;padding:22px 0;border-top:1px solid rgba(255,255,255,.12)}
.day b{font-size:30px;letter-spacing:.08em;text-transform:uppercase;color:#ff5a60;font-weight:600}.day small{display:block;font-size:26px;color:rgba(255,255,255,.4);margin-top:6px;letter-spacing:0;text-transform:none;font-weight:400}
.day p{font-size:33px;line-height:1.3;color:rgba(255,255,255,.92)}
.day i{display:block;font-style:normal;font-size:21px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}.day i.q{color:#ff5a60}.day i.e{color:rgba(120,230,170,.85)}
.day p.s{font-size:25px;color:rgba(255,255,255,.5);margin-top:4px}
.day.t{padding:12px 0;grid-template-columns:150px 1fr}.day.t p{font-size:27px;line-height:1.22}.day.t p.s{font-size:22px;margin-top:2px}.day.t i{font-size:18px;margin-bottom:2px}.day.t b{font-size:25px}.day.t small{font-size:21px}`;
const shell = (body: string, page: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="g" style="width:1300px;height:1300px;left:-300px;top:300px;background:radial-gradient(closest-side,rgba(229,52,59,.34),transparent 70%)"></div><div class="g" style="width:1000px;height:1000px;right:-450px;top:-300px;background:radial-gradient(closest-side,rgba(90,110,255,.15),transparent 70%)"></div><img class="logo" src="logo.png"><div class="pg">${page}</div>${body}</body></html>`;

const w0 = nocnaWeek("s50", n);
const slides: string[] = [];
slides.push(
  shell(
    `<div class="w" style="top:330px"><p class="m" style="font-size:40px;letter-spacing:.14em;text-transform:uppercase">Nocna Dycha · Siedlce</p>
<h1 style="font-size:150px;margin-top:34px">Tydzień<br><span class="red">${n}</span> z ${NOCNA.weeks}.</h1>
<p class="m" style="font-size:44px;line-height:1.35;margin-top:48px">${pl(w0.monday)} – ${pl(plus(w0.monday, 6))}<br>Plan na 5 poziomów:<br>od pierwszej dychy do sub 40.</p></div>
<div class="foot"><span>@vyra.athl</span><span>przesuń →</span></div>`,
    `1 / ${LEVELS.length + 3}`,
  ),
);
const TOTAL = LEVELS.length + 3;
const r = (line: string, z: ReturnType<typeof levelZones>, feel = false) => esc(resolveLine(line, z, feel).replace(/\/km/g, ""));

// Slajd 2: tabela temp dla wszystkich poziomów.
const ZK = ["easy", "threshold", "tenK", "vo2"] as const;
const head = ZK.map((k) => `<th>${ZONE_NAME[k]}</th>`).join("");
const body = LEVELS.map((l) => {
  const z = levelZones(l.k as NLevel);
  const FEEL: Record<string, string> = { easy: "na rozmowę", threshold: "pojedyncze słowa", vo2: "mocno" };
  return `<tr><td class="lv">${esc(l.name)}</td>${ZK.map((k) => `<td>${byFeel(l.k as NLevel) && k !== "tenK" ? `<span style="font-size:24px;color:rgba(255,255,255,.7)">${FEEL[k]}</span>` : paceText(z[k])}</td>`).join("")}</tr>`;
}).join("");
slides.push(
  shell(
    `<style>table{width:100%;border-collapse:collapse;margin-top:56px}th{font-size:24px;font-weight:500;color:rgba(255,255,255,.5);text-align:left;padding:0 0 18px;letter-spacing:.02em}td{font-size:32px;font-variant-numeric:tabular-nums;padding:26px 0;border-top:1px solid rgba(255,255,255,.12)}td.lv{font-weight:700;color:#ff5a60}</style>
<div class="w" style="top:200px"><p class="m" style="font-size:30px;letter-spacing:.14em;text-transform:uppercase">Ściąga · min/km</p>
<h1 style="font-size:104px;margin-top:18px">Twoje tempa<span class="red">.</span></h1>
<p class="m" style="font-size:32px;line-height:1.4;margin-top:22px">Znajdź swój poziom. Spokojnie biegasz naprawdę spokojnie, mocno tylko w akcentach.</p>
<table><tr><th></th>${head}</tr>${body}</table></div>
<div class="foot"><span>@vyra.athl</span><span>w aplikacji z Twojego wyniku</span></div>`,
    `2 / ${TOTAL}`,
  ),
);

LEVELS.map((l) => l.k as NLevel).forEach((lv, i) => {
  const w = nocnaWeek(lv, n);
  const z = levelZones(lv);
  const meta = LEVELS.find((l) => l.k === lv)!;
  const tight = w.days.length > 4;
  const rows = w.days
    .map(
      (d) =>
        `<div class="day${tight ? " t" : ""}"><div><b>${d.label.slice(0, 3)}</b><small>${String(d.km).replace(".", ",")} km</small></div><div><i class="${d.kind === "quality" || d.kind === "race" ? "q" : "e"}">${esc(d.title)}</i><p>${r(d.main, z, byFeel(lv))}</p>${d.sub.map((x) => `<p class="s">${r(x, z, byFeel(lv))}</p>`).join("")}</div></div>`,
    )
    .join("");
  slides.push(
    shell(
      `<div class="w" style="top:180px"><p class="m" style="font-size:28px;letter-spacing:.14em;text-transform:uppercase">${esc(meta.days)} · ok. ${String(w.km).replace(".", ",")} km</p>
<h1 style="font-size:${tight ? 84 : 100}px;margin-top:14px">${esc(meta.name)}<span class="red">.</span></h1>
<p class="m" style="font-size:30px;margin:14px 0 26px">Cel: ${esc(meta.goal)}</p>${rows}</div>
<div class="foot"><span>${esc(w.phase)}</span><span>tempa w min/km</span></div>`,
      `${i + 3} / ${TOTAL}`,
    ),
  );
});
slides.push(
  shell(
    `<div class="w" style="top:380px"><h1 style="font-size:112px">Tempa<br>liczone <span class="red">dla Ciebie.</span></h1>
<p class="m" style="font-size:40px;line-height:1.4;margin-top:44px">Wpisz swój wynik w aplikacji VYRA, a plan pokaże Twoje min/km na każdy trening. Za darmo.</p>
<p style="font-size:38px;margin-top:56px;font-weight:600">vyraathl.pl/nocna-dycha</p></div>
<div class="foot"><span>@vyra.athl</span><span>Nocna Ekipa VYRA</span></div>`,
    `${TOTAL} / ${TOTAL}`,
  ),
);

const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < slides.length; i++) {
  const f = join(out, `s${i + 1}.html`);
  writeFileSync(f, slides[i]);
  await pg.goto(`file://${resolve(f)}`);
  const over = await pg.evaluate(() => document.querySelector(".w")!.getBoundingClientRect().bottom > 1350 - 140);
  if (over) console.warn(`UWAGA: slajd ${i + 1} za długi, skróć treść`);
  await pg.screenshot({ path: join(out, `VYRA_nocna_tydzien${n}_${i + 1}.png`) });
}
await browser.close();
console.log("OK", out);
