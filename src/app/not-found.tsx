import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <main className="grid min-h-dvh place-content-center gap-6 px-6 text-center">
      <Logo className="mx-auto h-5" />
      <div className="grid gap-2">
        <p className="eyebrow">404</p>
        <h1 className="display text-2xl">{t("Nie ma takiej strony", "Page not found")}</h1>
        <p className="text-sm text-muted">{t("Strona nie istnieje albo nie masz do niej dostępu.", "The page doesn’t exist or you don’t have access to it.")}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline">
          <Link href="/">{t("Strona główna", "Home")}</Link>
        </Button>
        <Button asChild>
          <Link href="/panel">{t("Wróć do panelu", "Back to dashboard")}</Link>
        </Button>
      </div>
    </main>
  );
}
