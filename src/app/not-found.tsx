import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-content-center gap-6 px-6 text-center">
      <Logo className="mx-auto h-5" />
      <div className="grid gap-2">
        <p className="eyebrow">404</p>
        <h1 className="display text-2xl">Nie ma takiej strony</h1>
        <p className="text-sm text-muted">Strona nie istnieje albo nie masz do niej dostępu.</p>
      </div>
      <Button asChild className="mx-auto w-fit">
        <Link href="/">Wróć do panelu</Link>
      </Button>
    </main>
  );
}
