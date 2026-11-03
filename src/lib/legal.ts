/**
 * Default texts of the legal pages, in the simple format of the panel editor
 * (## heading, "1. " numbered items, "- " bullets, **bold**, [text](link)).
 * Placeholders are filled from the company details: {{sprzedawca}}, {{dane}}, {{kontakt}}.
 */

export const REGULAMIN_PL = `## §1. Sprzedawca i usługi

1. Sprzedawcą usług dostępnych na tej stronie jest {{sprzedawca}}, prowadzący markę VYRA{{dane}}. Kontakt: {{kontakt}}.
2. Sprzedawca świadczy usługi prowadzenia treningowego online: pakiety miesięczne (abonament) oraz usługi jednorazowe, np. pakiet Start, konsultację lub gotowy plan treningowy. Zakres każdego pakietu i cena są opisane na stronie [Prowadzenie](/prowadzenie).
3. Usługi są realizowane w aplikacji VYRA oraz przez kontakt z trenerem. Do korzystania potrzebne jest urządzenie z dostępem do internetu i aktualną przeglądarką oraz adres e-mail.

## §2. Zamówienie i płatność

1. Aby kupić pakiet, kliknij „Kup teraz”, podaj imię, nazwisko i adres e-mail, zaakceptuj regulamin i zapłać na stronie operatora płatności Stripe (BLIK, karta płatnicza, Przelewy24). Umowa zostaje zawarta z chwilą zaksięgowania płatności. Potwierdzenie otrzymasz e-mailem.
2. Ceny podane na stronie są cenami końcowymi w złotych polskich. Kod rabatowy wpisujesz na stronie płatności; rabaty nie łączą się, chyba że opis kodu mówi inaczej.
3. Pakiety miesięczne odnawiają się automatycznie co miesiąc i są pobierane z tej samej metody płatności. Abonament możesz zakończyć w każdej chwili w ustawieniach aplikacji VYRA (Płatności) albo pisząc do nas; kończy się on z ostatnim dniem opłaconego okresu, bez dalszych opłat. Cena przy współpracy na 3 miesiące jest ustalana indywidualnie.
4. Dostęp do aplikacji trwa przez okres opłaconego pakietu lub abonamentu. Po jego zakończeniu konto przestaje być prowadzone przez trenera, a historia treningów i rekordy zostają zachowane.

## §3. Realizacja usługi

1. Zaraz po płatności zakładasz konto w aplikacji VYRA i wypełniasz ankietę startową, a w kalendarzu pojawia się pierwszy tydzień treningów. W ciągu jednego dnia roboczego kontaktujemy się, aby umówić rozmowę wstępną. Kolejne tygodnie planu przygotowujemy na podstawie ankiety i informacji, które nam przekażesz.
2. Usługi VYRA nie są usługami medycznymi ani fizjoterapeutycznymi. Trenujesz na własną odpowiedzialność. Przed rozpoczęciem treningu, zwłaszcza po przerwie lub przy chorobach przewlekłych, skonsultuj się z lekarzem. Informuj trenera o bólu, urazach i chorobach.
3. Plany i materiały są przeznaczone wyłącznie do Twojego użytku. Nie wolno ich udostępniać ani sprzedawać dalej.

## §4. Prawo odstąpienia od umowy (konsumenci)

1. Jako konsument możesz odstąpić od umowy w ciągu 14 dni od jej zawarcia bez podania przyczyny. Wystarczy wiadomość e-mail lub przez formularz kontaktowy z informacją o odstąpieniu.
2. Przy zakupie prosisz o rozpoczęcie usługi przed upływem 14 dni. Jeśli odstąpisz po jej rozpoczęciu, zapłacisz za usługi wykonane do chwili odstąpienia, proporcjonalnie do ceny. Po pełnym wykonaniu usługi (np. przekazaniu kompletnego planu lub odbyciu konsultacji) prawo odstąpienia nie przysługuje, o czym zostajesz poinformowany przed zakupem.
3. Zwrot należności następuje w ciągu 14 dni tą samą metodą płatności, której użyto przy zakupie.

## §5. Vouchery prezentowe

1. Voucher to opłacony z góry pakiet prowadzenia, który kupujący przekazuje innej osobie. Po płatności kupujący otrzymuje kod vouchera na stronie i e-mailem.
2. Voucher jest ważny 12 miesięcy od zakupu. Realizuje się go na stronie [Zrealizuj voucher](/voucher/realizuj); czas pakietu liczy się od dnia realizacji. Voucher na pakiet miesięczny obejmuje jeden miesiąc prowadzenia, bez automatycznego odnowienia.
3. Voucher można zrealizować jeden raz, na jedno konto. Nie podlega wymianie na gotówkę. Kod należy chronić jak gotówkę: nie odpowiadamy za jego wykorzystanie przez osobę, której kupujący lub obdarowany go przekazał.
4. Kupujący może odstąpić od umowy na zasadach z §4, dopóki voucher nie został zrealizowany. Po realizacji uprawnienia z §4 przysługują obdarowanemu, a zwrot trafia do kupującego.

## §6. Program poleceń

1. Zawodnik z aktywnym kontem otrzymuje w aplikacji osobisty link polecający. Osoba, która wejdzie z tego linku i kupi pakiet w ciągu 60 dni, otrzymuje rabat na pierwszą płatność w wysokości podanej na stronie polecenia.
2. Polecający otrzymuje za każdą osobę, która dołączyła i zapłaciła z jego linku: 14 dni dodatkowego dostępu przy pakiecie jednorazowym albo obniżkę następnej płatności abonamentu o kwotę podaną w aplikacji. Nagroda nie przysługuje za zakup na własny adres e-mail.
3. Nagrody nie podlegają wymianie na gotówkę. W razie odstąpienia od umowy przez poleconą osobę nagroda może zostać cofnięta. Sprzedawca może zakończyć program poleceń; nagrody za zakupy dokonane wcześniej zostają przyznane.

## §7. Reklamacje

1. Reklamacje dotyczące usług zgłaszaj przez {{kontakt}}, opisując problem. Odpowiadamy w ciągu 14 dni.
2. Konsument może też skorzystać z pozasądowych sposobów rozwiązywania sporów, np. pomocy miejskiego lub powiatowego rzecznika konsumentów.

## §8. Postanowienia końcowe

1. Zasady przetwarzania danych opisuje [polityka prywatności](/polityka-prywatnosci).
2. W sprawach nieuregulowanych stosuje się prawo polskie, w szczególności Kodeks cywilny i ustawę o prawach konsumenta. Regulamin nie ogranicza praw konsumenta wynikających z przepisów.
3. Zmiany regulaminu nie dotyczą umów zawartych przed zmianą. W razie rozbieżności między wersjami językowymi rozstrzyga wersja polska.`;

export const REGULAMIN_EN = `## §1. Seller and services

1. The seller of the services on this website is {{sprzedawca}}, who runs the VYRA brand{{dane}}. Contact: {{kontakt}}.
2. The seller provides online training services: monthly packages (subscription) and one-off services such as the Start package, a consultation or a ready-made training plan. The scope and price of each package are described on the [Coaching](/prowadzenie) page.
3. Services are delivered in the VYRA app and through contact with the coach. You need a device with internet access, an up-to-date browser and an e-mail address.

## §2. Ordering and payment

1. To buy a package, click “Buy now”, enter your name and e-mail, accept these terms and pay on the Stripe payment page (BLIK, card, Przelewy24). The contract is concluded when the payment is confirmed. You will receive a confirmation by e-mail.
2. Prices on the website are final prices in Polish złoty. Discount codes are entered on the payment page; discounts cannot be combined unless the code says otherwise.
3. Monthly packages renew automatically each month and are charged to the same payment method. You can cancel at any time in the VYRA app settings (Payments) or by writing to us; the subscription ends on the last day of the paid period with no further charges. The 3-month commitment price is arranged individually.
4. App access lasts for the paid package or subscription period. Afterwards the account is no longer coached, and your training history and records are kept.

## §3. Delivery of the service

1. Right after paying you create your VYRA account and fill in the starting questionnaire, and your first week of training appears in the calendar. Within one working day we contact you to schedule an initial call. We build the following weeks based on the questionnaire and the information you give us.
2. VYRA services are not medical or physiotherapy services. You train at your own risk. Before starting, especially after a break or with chronic conditions, consult a doctor. Tell your coach about pain, injuries and illness.
3. Plans and materials are for your personal use only. They may not be shared or resold.

## §4. Right of withdrawal (consumers)

1. As a consumer you may withdraw from the contract within 14 days of concluding it without giving a reason. A message by e-mail or through the contact form is enough.
2. When buying you ask for the service to start within the 14-day period. If you withdraw after it has started, you pay for the services provided up to that point, in proportion to the price. Once the service has been fully performed (e.g. a complete plan delivered or a consultation held) the right of withdrawal no longer applies, as you are informed before purchase.
3. Refunds are made within 14 days using the same payment method as the purchase.

## §5. Gift vouchers

1. A voucher is a prepaid coaching package the buyer gives to someone else. After payment the buyer receives the voucher code on the website and by e-mail.
2. A voucher is valid for 12 months from purchase and is redeemed on the [Redeem a voucher](/voucher/realizuj) page; the package time starts on the day of redemption. A monthly package voucher covers one month of coaching with no automatic renewal.
3. A voucher can be redeemed once, for one account, and cannot be exchanged for cash. Keep the code safe like cash.
4. The buyer may withdraw under §4 until the voucher is redeemed. After redemption the rights under §4 belong to the recipient, and any refund goes to the buyer.

## §6. Referral programme

1. An athlete with an active account gets a personal referral link in the app. A person who opens it and buys a package within 60 days gets a discount on their first payment as shown on the referral page.
2. For each person who joins and pays through their link, the referrer gets 14 extra days of access on a one-off package, or a reduction of their next subscription payment by the amount shown in the app. No reward is given for purchases with the referrer’s own e-mail.
3. Rewards cannot be exchanged for cash and may be withdrawn if the referred person withdraws from the contract. The seller may end the programme; rewards for earlier purchases are still granted.

## §7. Complaints

1. Send complaints about the services via {{kontakt}}, describing the problem. We reply within 14 days.
2. Consumers may also use out-of-court dispute resolution, e.g. help from a local consumer ombudsman.

## §8. Final provisions

1. Personal data processing is described in the [privacy policy](/polityka-prywatnosci).
2. Matters not covered here are governed by Polish law, in particular the Civil Code and the Consumer Rights Act. These terms do not limit consumer rights under the law.
3. Changes to these terms do not affect contracts concluded before the change. The Polish version prevails over the English translation.`;

export const POLITYKA_PL = `## Administrator danych

Administratorem danych osobowych przekazanych przez tę stronę jest {{sprzedawca}}, prowadzący markę VYRA{{dane}}. W sprawach dotyczących danych możesz skontaktować się przez {{kontakt}}.

## Jakie dane i po co

- Formularz „Lista zainteresowanych obozami”: imię i adres e-mail, aby poinformować Cię o terminie i programie obozu.
- Formularz „Zapytaj o prowadzenie” i zapytania firmowe: imię i nazwisko, e-mail, cel treningowy oraz informacje, które sam podasz, aby odpowiedzieć na zgłoszenie i przygotować propozycję współpracy.
- Zakup pakietu: płatność obsługuje Stripe (Stripe Payments Europe Ltd.), który przetwarza dane płatności jako odrębny administrator. My otrzymujemy imię i nazwisko, e-mail, nazwę pakietu i kwotę, aby zrealizować usługę i rozliczyć sprzedaż.
- Darmowy plan „Zacznij biegać” i zapisy na Run Club: imię i e-mail, aby udostępnić plan lub potwierdzić zapis i skontaktować się w sprawie treningów. Zgodę możesz wycofać w każdej chwili.
- Voucher prezentowy: imię i e-mail kupującego, imię obdarowanego i życzenia, które wpiszesz, aby wystawić i przesłać voucher; przy realizacji imię, nazwisko i e-mail obdarowanego, aby założyć konto.
- Program poleceń: kod polecającego i informacja o zakupie z jego linku, aby przyznać rabat i nagrodę.
- Konto w platformie VYRA (dla zawodników): dane potrzebne do prowadzenia treningu, w tym plan i wyniki treningów.
- Opinia o współpracy: ocena i opinia, którą sam wpiszesz w aplikacji. Publikujemy ją na stronie i w mediach społecznościowych VYRA tylko za Twoją zgodą, z podpisem, który wybierzesz.
- Ankieta startowa i poranna ocena gotowości: informacje o zdrowiu, kontuzjach i samopoczuciu, które sam podasz, aby trener mógł bezpiecznie ułożyć plan. Widzi je tylko Twój trener.

## Podstawa przetwarzania

Dane z formularzy przetwarzamy na podstawie Twojej zgody (art. 6 ust. 1 lit. a RODO) oraz w celu podjęcia działań przed zawarciem umowy i jej wykonania (art. 6 ust. 1 lit. b RODO). Dane o zdrowiu przetwarzamy wyłącznie na podstawie Twojej wyraźnej zgody (art. 9 ust. 2 lit. a RODO). Zgodę możesz wycofać w każdej chwili.

## Jak długo przechowujemy dane

Dane ze zgłoszeń przechowujemy do czasu zakończenia kontaktu lub wycofania zgody, nie dłużej niż 24 miesiące. Dane zawodników przechowujemy przez czas współpracy, a po jej zakończeniu usuwamy je na Twoją prośbę. Dane rozliczeniowe przechowujemy tak długo, jak wymagają tego przepisy podatkowe.

## Komu powierzamy dane

Dane są przechowywane u dostawców usług technicznych, z których korzysta strona: Supabase (baza danych), Vercel (hosting i anonimowe statystyki odwiedzin) i Resend (wysyłka wiadomości e-mail, np. potwierdzeń zakupu, vouchera i przypomnień o Run Clubie). Płatności obsługuje Stripe. Nie sprzedajemy danych i nie przekazujemy ich w celach marketingowych.

## Twoje prawa

Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia oraz wycofania zgody. Przysługuje Ci również prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych.

## Pliki cookies i statystyki

- Pliki niezbędne: logowanie w platformie i zapamiętanie wybranego języka.
- Plik „vyra-consent”: zapamiętuje Twój wybór z banera cookies.
- Plik „vyra-src”: zapisujemy go tylko po kliknięciu „Akceptuję”. Zapamiętuje przez 60 dni, skąd trafiłeś na stronę (np. Instagram, Google albo strona ambasadora), abyśmy wiedzieli, które działania działają. Nie zawiera Twoich danych osobowych. Wyjątek: jeśli wejdziesz z linku polecającego znajomego, zapamiętujemy kod polecenia także przy wyborze „Tylko niezbędne”, bo bez tego nie naliczymy Twojego rabatu.
- Swój wybór możesz zmienić w każdej chwili linkiem „Ustawienia cookies” w stopce strony.
- Statystyki odwiedzin są zbierane anonimowo, bez plików cookies. Nie używamy cookies reklamowych.

Pliki cookies możesz usunąć lub zablokować w ustawieniach przeglądarki.`;

export const POLITYKA_EN = `## Data controller

The controller of personal data submitted through this website is {{sprzedawca}}, who runs the VYRA brand{{dane}}. For any data matters you can get in touch via {{kontakt}}.

## What data and why

- The “Camp interest list” form: your name and email address, to tell you about the camp dates and programme.
- The “Ask about coaching” form and company inquiries: your full name, email, training goal and any information you choose to give, to reply and prepare a proposal.
- Buying a package: payments are handled by Stripe (Stripe Payments Europe Ltd.), which processes payment data as a separate controller. We receive your name, e-mail, the package and the amount to deliver the service and account for the sale.
- The free “Start running” plan and Run Club sign-ups: your name and e-mail, to give you the plan or confirm your place and contact you about training. You can withdraw consent at any time.
- Gift vouchers: the buyer’s name and e-mail, the recipient’s name and the message you enter, to issue and send the voucher; on redemption, the recipient’s name and e-mail to create the account.
- Referral programme: the referrer’s code and the fact of a purchase through their link, to apply the discount and the reward.
- A VYRA platform account (for athletes): the data needed for coaching, including your plan and training results.
- Feedback: the rating and opinion you enter in the app. We publish it on the website and VYRA social media only with your consent, under the name you choose.
- The starting questionnaire and morning readiness check: information about your health, injuries and wellbeing that you choose to give, so your coach can plan safely. Only your coach sees it.

## Legal basis

We process form data on the basis of your consent (Art. 6(1)(a) GDPR) and to take steps before and perform a contract (Art. 6(1)(b) GDPR). Health data is processed only with your explicit consent (Art. 9(2)(a) GDPR). You can withdraw consent at any time.

## How long we keep data

We keep data from requests until our contact ends or you withdraw consent, and no longer than 24 months. Athletes’ data is kept for the duration of coaching and deleted at your request once it ends. Billing data is kept as long as tax law requires.

## Who processes data for us

Data is stored with the technical providers the website uses: Supabase (database), Vercel (hosting and anonymous visit statistics) and Resend (sending e-mails such as purchase confirmations, vouchers and Run Club reminders). Payments are handled by Stripe. We do not sell data or share it for marketing purposes.

## Your rights

You have the right to access, rectify and erase your data, to restrict processing, to data portability and to withdraw consent. You also have the right to lodge a complaint with the Polish data protection authority (Prezes Urzędu Ochrony Danych Osobowych).

## Cookies and statistics

- Essential cookies: signing in to the platform and remembering your chosen language.
- The “vyra-consent” cookie: remembers your choice in the cookie banner.
- The “vyra-src” cookie: set only after you click “Accept”. It remembers for 60 days where you came from (e.g. Instagram, Google or an ambassador page), so we know what works. It contains no personal data. Exception: if you arrive through a friend’s referral link, we keep the referral code even with “Essential only”, because otherwise we cannot apply your discount.
- You can change your choice at any time with the “Cookie settings” link in the footer.
- Visit statistics are collected anonymously, without cookies. We do not use advertising cookies.

You can delete or block cookies in your browser settings.`;

export const LEGAL_DEFAULTS = {
  regulamin: { pl: REGULAMIN_PL, en: REGULAMIN_EN },
  "polityka-prywatnosci": { pl: POLITYKA_PL, en: POLITYKA_EN },
} as const;

/** Fills the placeholders with the company details. */
export function fillLegal(text: string, c: { controller: string; address: string; tax_id: string; email: string }, lang: "pl" | "en"): string {
  const parts = [c.address, c.tax_id ? `NIP ${c.tax_id}` : ""].filter(Boolean).join(", ");
  const contact = c.email ? `[${c.email}](mailto:${c.email})` : lang === "en" ? "[the contact form](/kontakt)" : "[formularz kontaktowy](/kontakt)";
  return text
    .replaceAll("{{sprzedawca}}", c.controller)
    .replaceAll("{{dane}}", parts ? `, ${parts}` : "")
    .replaceAll("{{kontakt}}", contact);
}
