/**
 * Karuzela na Instagram: plan tygodnia Nocnej Ekipy VYRA.
 * Użycie: node --experimental-strip-types scripts/nocna-karuzela.mts <tydzień 1-24> <katalog-wyjściowy>
 * Wymaga: playwright (chromium) i fontu Inter w systemie.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LEVELS, NOCNA, REF_P5K, nocnaWeek, resolveLine, zonesFromP5k, type NLevel } from "../src/lib/app/nocna-plan.ts";

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
.day p{font-size:33px;line-height:1.3;color:rgba(255,255,255,.92)}.day p+p{color:rgba(255,255,255,.6);margin-top:4px}`;
const shell = (body: string, page: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="g" style="width:1300px;height:1300px;left:-300px;top:300px;background:radial-gradient(closest-side,rgba(229,52,59,.34),transparent 70%)"></div><div class="g" style="width:1000px;height:1000px;right:-450px;top:-300px;background:radial-gradient(closest-side,rgba(90,110,255,.15),transparent 70%)"></div><img class="logo" src="logo.png"><div class="pg">${page}</div>${body}</body></html>`;

const w0 = nocnaWeek("pro", n);
const slides: string[] = [];
slides.push(
  shell(
    `<div class="w" style="top:330px"><p class="m" style="font-size:40px;letter-spacing:.14em;text-transform:uppercase">Nocna Dycha · Siedlce</p>
<h1 style="font-size:150px;margin-top:34px">Tydzień<br><span class="red">${n}</span> z ${NOCNA.weeks}.</h1>
<p class="m" style="font-size:44px;line-height:1.35;margin-top:48px">${pl(w0.monday)} – ${pl(plus(w0.monday, 6))}<br>Plan na dwa poziomy.</p></div>
<div class="foot"><span>@vyra.athl</span><span>przesuń →</span></div>`,
    `1 / 4`,
  ),
);
(["start", "pro"] as NLevel[]).forEach((lv, i) => {
  const w = nocnaWeek(lv, n);
  const z = zonesFromP5k(REF_P5K[lv]);
  const meta = LEVELS.find((l) => l.k === lv)!;
  const rows = w.days
    .map((d) => `<div class="day"><div><b>${d.label.slice(0, 3)}</b><small>${d.km} km</small></div><div>${d.lines.map((l) => `<p>${esc(resolveLine(l, z))}</p>`).join("")}</div></div>`)
    .join("");
  slides.push(
    shell(
      `<div class="w" style="top:190px"><p class="m" style="font-size:30px;letter-spacing:.14em;text-transform:uppercase">${esc(meta.days)} · ok. ${w.km} km</p>
<h1 style="font-size:104px;margin-top:18px">${esc(meta.name)}<span class="red">.</span></h1>
<p class="m" style="font-size:32px;margin:18px 0 30px">Cel: ${esc(meta.goal)}</p>${rows}</div>
<div class="foot"><span>${esc(w.phase)}</span><span>Tempa dla celu, w aplikacji z Twojego wyniku</span></div>`,
      `${i + 2} / 4`,
    ),
  );
});
slides.push(
  shell(
    `<div class="w" style="top:380px"><h1 style="font-size:112px">Tempa<br>liczone <span class="red">dla Ciebie.</span></h1>
<p class="m" style="font-size:40px;line-height:1.4;margin-top:44px">Wpisz swój wynik w aplikacji VYRA, a plan pokaże konkretne min/km na każdy trening. Za darmo.</p>
<p style="font-size:38px;margin-top:56px;font-weight:600">vyraathl.pl/nocna-dycha</p></div>
<div class="foot"><span>@vyra.athl</span><span>Nocna Ekipa VYRA</span></div>`,
    `4 / 4`,
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
