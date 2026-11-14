import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { PageHead, SectionHead } from "@/components/app/ui";
import { CampWaitlistForm } from "@/components/site/lead-forms";
import { RichText } from "@/components/site/rich-text";
import { lines } from "@/lib/camps";
import { getCamp, takenPlaces } from "@/lib/data/camps";
import { getT } from "@/lib/i18n/server";
import { campDatesL, campFormatLabel, formatPrice } from "@/lib/i18n/labels";
import { pick } from "@/lib/i18n/shared";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Obóz" };

export default async function AppCamp({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { lang, t } = await getT();
  const supabase = await createClient();
  const camp = await getCamp(supabase, { slug });
  if (!camp) notFound();
  const taken = (await takenPlaces(supabase))[camp.id] ?? 0;
  const left = camp.capacity == null ? null : Math.max(camp.capacity - taken, 0);
  const open = camp.status === "published" && left !== 0;
  const description = pick(lang, camp.description, camp.description_en);
  const included = lines(pick(lang, camp.included, camp.included_en));
  const soon = t("wkrótce", "coming soon");
  const facts: [string, string][] = [
    [t("Termin", "Dates"), campDatesL(camp, lang) ?? soon],
    [t("Miejsce", "Venue"), [camp.location, camp.venue].filter(Boolean).join(" · ") || soon],
    [t("Format", "Format"), campFormatLabel(camp.format, t)],
    [t("Cena", "Price"), formatPrice(camp.price_pln, lang) ?? soon],
    [t("Miejsca", "Places"), camp.capacity == null ? t("grupa kameralna", "small group") : t(`${left} z ${camp.capacity} wolnych`, `${left} of ${camp.capacity} left`)],
  ];
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title={pick(lang, camp.title, camp.title_en) ?? camp.title} sub={pick(lang, camp.summary, camp.summary_en) ?? undefined} />
      <div className="divide-y divide-white/[0.05] rounded-[20px] border border-white/[0.06] bg-[#111113]">
        {facts.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <span className="text-[13px] text-white/45">{k}</span>
            <span className="text-right text-[14px]">{v}</span>
          </div>
        ))}
      </div>
      {included.length ? (
        <>
          <SectionHead title={t("W cenie", "Included")} />
          <ul className="grid gap-2 rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
            {included.map((x) => (
              <li key={x} className="flex gap-2.5 text-[14px] leading-snug text-white/75">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" /> {x}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {description ? (
        <div className="mt-3 rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
          <RichText text={description} className="grid gap-3 text-[14px] leading-relaxed text-white/65 [&_h2]:mt-3 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h2]:text-white [&_h3]:font-semibold [&_h3]:text-white [&_strong]:text-white" />
        </div>
      ) : null}
      <SectionHead title={open ? t("Zarezerwuj miejsce", "Reserve your place") : t("Lista na kolejny termin", "Next date list")} />
      <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
        <p className="mb-4 text-[13px] leading-relaxed text-white/50">
          {open
            ? t("Zostaw dane, a odezwiemy się ze szczegółami i informacją o płatności. Miejsce potwierdzamy po wpłacie zaliczki.", "Leave your details and we’ll get back with details and payment info.")
            : t("Na ten termin nie ma miejsc. Zostaw dane, a o kolejnym obozie dowiesz się pierwszy.", "This date is full. Leave your details to hear first about the next one.")}
        </p>
        {open ? <CampWaitlistForm campId={camp.id} withPhone submitLabel={t("Wyślij zgłoszenie", "Send request")} /> : <CampWaitlistForm />}
      </div>
    </div>
  );
}
