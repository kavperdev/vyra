import { MapPin, Navigation } from "lucide-react";
import { AddToCalendar, RunClubSignup } from "@/components/site/club-forms";
import { listRunClubEvents, mapLink, runClubCounts } from "@/lib/data/club";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Run Club" };

export default async function AppRunClub() {
  const { t } = await getT();
  const supabase = await createClient();
  const [events, counts] = await Promise.all([listRunClubEvents(supabase, { upcoming: true }).catch(() => []), runClubCounts(supabase).catch(() => ({}) as Record<string, number>)]);
  const visible = events.filter((e) => e.visible);
  return (
    <div className="app-rise grid gap-4">
      <div className="pt-2">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-[var(--accent)]">VYRA Run Club</p>
        <h1 className="display mt-2 text-[34px] leading-[1.05]">{t("Biegamy razem. Za darmo.", "We run together. For free.")}</h1>
        <p className="mt-2 leading-relaxed text-white/65">
          {t(
            "Jedna grupa, tempo rozmowy, każdy poziom. Nikt nie zostaje sam.",
            "One group, conversational pace, every level. Nobody gets left behind.",
          )}
        </p>
      </div>
      {visible.length ? (
        visible.map((e) => {
          const taken = counts[e.id] ?? 0;
          const full = e.capacity != null && taken >= e.capacity;
          const cal = { title: e.title, starts_at: e.starts_at, place: e.place, when: formatDate(e.starts_at, "EEEE, d MMMM · HH:mm") };
          return (
            <section key={e.id} className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="grid gap-2">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-[var(--accent)]">{formatDate(e.starts_at, "EEEE, d MMMM · HH:mm")}</p>
                <h2 className="text-2xl font-bold">{e.title}</h2>
                <p className="flex items-start gap-2 text-white/70">
                  <MapPin className="mt-1 size-4 shrink-0" /> {e.place}
                </p>
                {e.meeting_note ? <p className="text-white/60">{t("Zbiórka", "Meeting point")}: {e.meeting_note}</p> : null}
                {e.pace ? <p className="text-white/60">{t("Tempo", "Pace")}: {e.pace}</p> : null}
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                  {t("Zapisanych", "Signed up")}: {taken}
                  {e.capacity != null ? ` / ${e.capacity}` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a href={mapLink(e)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm">
                    <Navigation className="size-4" /> {t("Mapa", "Map")}
                  </a>
                  <AddToCalendar eventId={e.id} cal={cal} />
                </div>
              </div>
              <RunClubSignup eventId={e.id} full={full} />
            </section>
          );
        })
      ) : (
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xl font-bold">{t("Co czwartek o 18:00", "Every Thursday at 6 pm")}</p>
          <p className="mt-2 flex items-start gap-2 text-white/70">
            <MapPin className="mt-1 size-4 shrink-0" /> Park Aleksandria, Siedlce · {t("zbiórka przy łosiu", "meet at the elk statue")}
          </p>
          <p className="mt-3 text-sm text-white/55">{t("Kolejne terminy pojawią się tutaj wkrótce.", "Next dates will appear here soon.")}</p>
        </section>
      )}
      <section className="grid gap-2 rounded-3xl border border-white/10 p-5 text-[15px] text-white/70">
        <p className="font-semibold text-white">{t("Co zabrać", "What to bring")}</p>
        <p>{t("Buty do biegania, strój na cebulkę, czapkę i rękawiczki. Po zmroku odblask albo czołówkę. Wodę, jeśli potrzebujesz.", "Running shoes, layers, a hat and gloves. After dark a reflector or head torch. Water if you need it.")}</p>
      </section>
    </div>
  );
}
