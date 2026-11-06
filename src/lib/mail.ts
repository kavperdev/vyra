import "server-only";
import { publicOrigin } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Automatic e-mails through Resend (REST, no SDK). Needs RESEND_API_KEY and VYRA_PURCHASE_SECRET;
 * without them nothing is sent and the site works as before. Every e-mail has a key, so it goes
 * out once even when the thank-you page and the Stripe webhook both run.
 */
export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.VYRA_PURCHASE_SECRET);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface MailContent {
  subject: string;
  /** Short line shown in the inbox preview. */
  preview: string;
  title: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  /** Optional highlighted box, e.g. a voucher code. */
  highlight?: { label: string; value: string };
  after?: string[];
}

function html(m: MailContent): string {
  const p = (t: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2b2b30">${esc(t)}</p>`;
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(m.subject)}</title></head>
<body style="margin:0;padding:0;background:#f2f2f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(m.preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#050506;padding:28px 32px">
<div style="color:#ffffff;font-size:20px;letter-spacing:10px;font-weight:700">VYRA</div>
<div style="color:#8e8e95;font-size:10px;letter-spacing:4px;margin-top:6px">ELITE IS STANDARD</div>
</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 20px;font-size:24px;line-height:1.25;color:#09090b">${esc(m.title)}</h1>
${m.paragraphs.map(p).join("")}
${m.highlight ? `<div style="margin:8px 0 24px;padding:18px 20px;border:1px dashed #b0b0b8;border-radius:12px"><div style="font-size:11px;letter-spacing:3px;color:#7c7c85;text-transform:uppercase">${esc(m.highlight.label)}</div><div style="font-family:Menlo,Consolas,monospace;font-size:24px;letter-spacing:3px;color:#09090b;margin-top:6px">${esc(m.highlight.value)}</div></div>` : ""}
${m.cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="background:#d92b31;border-radius:999px"><a href="${esc(m.cta.url)}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">${esc(m.cta.label)}</a></td></tr></table>` : ""}
${(m.after ?? []).map(p).join("")}
<p style="margin:24px 0 0;font-size:16px;color:#2b2b30">Kacper, VYRA</p>
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #e4e4e9;font-size:12px;line-height:1.5;color:#7c7c85">
<a href="${publicOrigin()}" style="color:#7c7c85">vyraathl.pl</a> · Instagram @vyra.athl<br>Masz pytanie? Odpowiedz na tego maila.
</td></tr>
</table></td></tr></table></body></html>`;
}

function text(m: MailContent): string {
  return [
    m.title,
    "",
    ...m.paragraphs,
    ...(m.highlight ? ["", `${m.highlight.label}: ${m.highlight.value}`] : []),
    ...(m.cta ? ["", `${m.cta.label}: ${m.cta.url}`] : []),
    ...(m.after?.length ? ["", ...m.after] : []),
    "",
    "Kacper, VYRA",
    publicOrigin(),
  ].join("\n");
}

/** Sends once per key. Returns true when the e-mail went out now. Never throws. */
export async function sendMailOnce(key: string, to: string, m: MailContent): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const secret = process.env.VYRA_PURCHASE_SECRET;
  if (!apiKey || !secret || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("mail_once", { p_secret: secret, p_key: key });
    if (error || data !== true) return false;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "VYRA <kontakt@vyraathl.pl>",
        to: [to],
        reply_to: process.env.MAIL_REPLY_TO || "kontakt@vyraathl.pl",
        subject: m.subject,
        html: html(m),
        text: text(m),
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[mail]", res.status, (await res.text()).slice(0, 300));
      await supabase.rpc("mail_unmark", { p_secret: secret, p_key: key });
      return false;
    }
    return true;
  } catch (e) {
    console.error("[mail]", e);
    return false;
  }
}

const first = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] || "";
const hi = (name: string | null | undefined) => (first(name) ? `Cześć ${first(name)}!` : "Cześć!");

/** Ready-made e-mails. Polish only: the brand's customers are Polish-speaking. */
export const MAILS = {
  purchase(o: { name: string | null; plan: string; token: string | null }): MailContent {
    const origin = publicOrigin();
    return o.token
      ? {
          subject: `Witaj w VYRA: załóż konto (${o.plan})`,
          preview: "Płatność przyjęta. Jeden krok do pierwszego tygodnia treningów.",
          title: hi(o.name),
          paragraphs: [
            `Dziękuję za zakup pakietu ${o.plan}. Płatność przyjęta.`,
            "Teraz trzy kroki: załóż konto w aplikacji VYRA (30 sekund), wypełnij ankietę startową (5 minut) i od razu zobaczysz swój pierwszy tydzień treningów w kalendarzu.",
          ],
          cta: { label: "Załóż konto", url: `${origin}/invite/${o.token}` },
          after: ["Link jest ważny 30 dni. W ciągu dnia roboczego odezwę się, żeby umówić krótką rozmowę o Twoim celu."],
        }
      : {
          subject: `Pakiet ${o.plan} jest na Twoim koncie VYRA`,
          preview: "Płatność przyjęta. Zaloguj się i zaczynamy.",
          title: hi(o.name),
          paragraphs: [`Dziękuję za zakup pakietu ${o.plan}. Dodałem go do Twojego konta VYRA.`],
          cta: { label: "Zaloguj się", url: `${origin}/login?next=/athlete` },
        };
  },

  voucher(o: { buyer: string | null; recipient: string | null; plan: string; code: string }): MailContent {
    const origin = publicOrigin();
    return {
      subject: `Twój voucher VYRA: ${o.code}`,
      preview: "Voucher gotowy do wydruku albo wysłania.",
      title: hi(o.buyer),
      paragraphs: [
        `Dziękuję! Voucher na pakiet ${o.plan}${o.recipient ? ` dla ${o.recipient}` : ""} jest gotowy.`,
        "Możesz go wydrukować, zapisać jako PDF albo po prostu przesłać link. Voucher jest ważny 12 miesięcy, a czas pakietu liczy się od dnia realizacji.",
      ],
      highlight: { label: "Kod vouchera", value: o.code },
      cta: { label: "Otwórz voucher", url: `${origin}/voucher/k/${o.code}` },
      after: [`Obdarowany realizuje go na ${origin}/voucher/realizuj`],
    };
  },

  freePlan(o: { name: string }): MailContent {
    const origin = publicOrigin();
    return {
      subject: "Twój darmowy plan: Zacznij biegać (6 tygodni)",
      preview: "18 treningów, 3 razy w tygodniu po około 35 minut.",
      title: hi(o.name),
      paragraphs: [
        "Oto Twój plan na 6 tygodni: 18 treningów, 3 razy w tygodniu po około 35 minut. Zaczynasz od minuty truchtu przeplatanej marszem.",
        "Zapisz ten mail. Link otwiera plan na każdym urządzeniu, a w planie możesz odhaczać treningi i dodać je do kalendarza w telefonie.",
      ],
      cta: { label: "Otwórz plan", url: `${origin}/zacznij-biegac?plan=1` },
      after: [
        "Jedna rada na start: biegaj wolniej, niż Ci się wydaje. Masz móc mówić pełnymi zdaniami.",
        "Jeśli po drodze pojawi się pytanie, odpowiedz na tego maila. Czytam każdą wiadomość.",
      ],
    };
  },

  runClubSignup(o: { name: string; title: string; when: string; place: string; map: string | null; eventId?: string }): MailContent {
    const origin = publicOrigin();
    return {
      subject: `Masz miejsce: ${o.title}, ${o.when}`,
      preview: `${o.when} · ${o.place}`,
      title: hi(o.name),
      paragraphs: [`Twoje miejsce na ${o.title} jest zarezerwowane.`, `Kiedy: ${o.when}`, `Gdzie: ${o.place}`],
      cta: o.map ? { label: "Pokaż na mapie", url: o.map } : undefined,
      after: [
        "Tempo dopasujemy do grupy, nikt nie zostaje sam. Dzień wcześniej przypomnę Ci o treningu.",
        ...(o.eventId ? [`Dodaj do kalendarza: ${origin}/api/run-club/${o.eventId}/ics`, `Weź kogoś ze sobą, wyślij mu link: ${origin}/run-club#t-${o.eventId}`] : []),
      ],
    };
  },

  challengeJoined(o: { name: string; title: string; memberNo: number; token: string; again?: boolean }): MailContent {
    const origin = publicOrigin();
    const link = `${origin}/wyzwania/moje?t=${o.token}`;
    return {
      subject: o.again ? `Twój link do wyzwania: ${o.title}` : `Jesteś w wyzwaniu: ${o.title} · VYRA #${String(o.memberNo).padStart(3, "0")}`,
      preview: "Tu wpisujesz swoje biegi.",
      title: `Cześć ${o.name}!`,
      paragraphs: o.again
        ? [`Oto Twój link do wyzwania „${o.title}”. Pod nim wpisujesz biegi i widzisz swój postęp.`]
        : [
            `Jesteś w wyzwaniu „${o.title}”. Twój numer w społeczności VYRA to #${String(o.memberNo).padStart(3, "0")}.`,
            "Po każdym biegu wejdź w link poniżej i wpisz dystans. Zajmuje to 10 sekund. Link jest tylko Twój, nie udostępniaj go.",
          ],
      cta: { label: "Wpisz bieg", url: link },
      after: ["Zapisz sobie ten mail albo dodaj link do ekranu głównego telefonu.", "Ranking i licznik całej społeczności znajdziesz na stronie wyzwania."],
    };
  },

  runClubNewDate(o: { title: string; when: string; place: string; pace: string | null; eventId: string; token: string }): MailContent {
    const origin = publicOrigin();
    return {
      subject: `Nowy termin: ${o.title}, ${o.when}`,
      preview: `${o.when} · ${o.place}. Zapisy otwarte.`,
      title: "Cześć!",
      paragraphs: [`Jest nowy termin wspólnego treningu: ${o.title}.`, `Kiedy: ${o.when}`, `Gdzie: ${o.place}`, ...(o.pace ? [`Tempo: ${o.pace}`] : [])],
      cta: { label: "Zapisz się", url: `${origin}/run-club#t-${o.eventId}` },
      after: ["Za darmo, dla każdego poziomu. Weź kogoś ze sobą.", `Nie chcesz więcej takich maili? Wypisz się: ${origin}/run-club/wypisz?t=${o.token}`],
    };
  },

  runClubReminder(o: { name: string; title: string; when: string; place: string; map: string | null; pace: string | null }): MailContent {
    return {
      subject: `Jutro: ${o.title}, ${o.when}`,
      preview: `Widzimy się jutro · ${o.place}`,
      title: hi(o.name),
      paragraphs: [`Przypominam: jutro ${o.title}.`, `Kiedy: ${o.when}`, `Gdzie: ${o.place}`, ...(o.pace ? [`Tempo: ${o.pace}`] : [])],
      cta: o.map ? { label: "Pokaż na mapie", url: o.map } : undefined,
      after: ["Weź wodę i ubierz się warstwowo. Jeśli nie możesz przyjść, odpisz krótko, żebyśmy na Ciebie nie czekali."],
    };
  },
};

/** "środa, 11 listopada, 18:30" in Polish time. */
export function whenPl(iso: string): string {
  return new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
