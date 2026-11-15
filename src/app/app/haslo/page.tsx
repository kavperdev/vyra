import { AppForgot } from "@/components/app/app-login";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Nowe hasło" };

export default function AppForgotPage() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Nie pamiętasz hasła?" sub="Podaj e-mail konta. Wyślemy link do ustawienia nowego hasła." />
      <AppForgot />
    </div>
  );
}
